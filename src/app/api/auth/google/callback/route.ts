import { NextRequest, NextResponse } from 'next/server'
import {
  validateOAuthState,
  exchangeGoogleCode,
  completeGoogleLogin,
  hasYouTubeScopes,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  OAUTH_STATE_COOKIE,
  oAuthStateCookieOptions,
  isGoogleConfigured,
} from '@/lib/auth'
import { storeYouTubeTokens } from '@/lib/youtube-oauth'
import { syncYouTubeData } from '@/lib/youtube-sync'
import { db } from '@/lib/db'

// GET /api/auth/google/callback?code=...&state=...
// Completes the real Google OAuth 2.0 authorization-code flow:
//   1. Validate the `state` query param against the value stored in the
//      short-lived OAuth state cookie (CSRF protection). Mismatch → 400.
//   2. Exchange the `code` for tokens via Google's token endpoint. The
//      response includes the id_token (user identity) AND, if the user
//      granted YouTube scopes, an access_token + refresh_token usable
//      for YouTube Data API calls.
//   3. Decode the id_token JWT to extract email, name, picture.
//   4. Upsert the User row in our DB (create if new, refresh profile if
//      returning) and create a session.
//   5. If the granted scope includes YouTube permissions, persist the
//      YouTube tokens and trigger an initial channel sync so the user's
//      dashboard is populated immediately — no separate "Connect YouTube"
//      step required.
//   6. Clear the OAuth state cookie and 302 redirect to / (the home page).
//
// On any error, redirect to /?auth_error=... so the AuthScreen can surface
// a friendly toast (the AuthScreen is rendered when no session is present).
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const home = new URL('/', appUrl)

  if (!isGoogleConfigured()) {
    home.searchParams.set('auth_error', 'google_not_configured')
    return NextResponse.redirect(home)
  }

  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const err = searchParams.get('error')

  // User denied consent, or Google returned an error.
  if (err) {
    home.searchParams.set('auth_error', err === 'access_denied' ? 'denied' : 'google_error')
    return NextResponse.redirect(home)
  }
  if (!code || !state) {
    home.searchParams.set('auth_error', 'invalid_callback')
    return NextResponse.redirect(home)
  }

  // Validate state (CSRF protection).
  const stateOk = await validateOAuthState(state)
  if (!stateOk) {
    home.searchParams.set('auth_error', 'state_mismatch')
    return NextResponse.redirect(home)
  }

  // Exchange code → id_token + access_token + scope.
  const tokens = await exchangeGoogleCode(code)
  if (!tokens || !tokens.userInfo || !tokens.userInfo.email) {
    home.searchParams.set('auth_error', 'token_exchange_failed')
    return NextResponse.redirect(home)
  }

  // Upsert user + create session. We need the user.id to store YouTube tokens.
  const sessionToken = await completeGoogleLogin(tokens.userInfo)
  if (!sessionToken) {
    home.searchParams.set('auth_error', 'session_failed')
    return NextResponse.redirect(home)
  }

  // Look up the user we just created/updated so we can store YouTube tokens.
  const user = await db.user.findUnique({
    where: { email: tokens.userInfo.email },
    select: { id: true, name: true },
  })

  // If the user granted YouTube scopes, persist the tokens and trigger an
  // initial sync. This is the "auto-connect" path: the user signs in with
  // Google, grants YouTube access once, and their channel data is synced
  // immediately — they never need to visit a separate "Connect YouTube" page.
  let ytSynced = false
  if (user && tokens.accessToken && hasYouTubeScopes(tokens.scope)) {
    try {
      await storeYouTubeTokens(user.id, {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn ?? 3600,
        token_type: tokens.tokenType ?? 'Bearer',
        scope: tokens.scope ?? '',
      })
      // Best-effort initial sync. If it fails, the user can use "Sync Now".
      await syncYouTubeData(user.id)
      ytSynced = true
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'system',
          title: 'YouTube channel connected',
          message: `Welcome${user.name ? `, ${user.name}` : ''}! Your YouTube account was connected and your channel data has been synced automatically.`,
          read: false,
        },
      }).catch(() => {})
    } catch (e) {
      console.error('[google/callback] YouTube auto-sync failed', e)
    }
  }

  // Tell the frontend whether YouTube was auto-connected so it can show a
  // toast and refresh the dashboard.
  if (ytSynced) {
    home.searchParams.set('yt', 'auto_synced')
  }

  // Set session cookie, clear state cookie, redirect home.
  const res = NextResponse.redirect(home)
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  res.cookies.set(OAUTH_STATE_COOKIE, '', { ...oAuthStateCookieOptions(), maxAge: 0 })
  return res
}
