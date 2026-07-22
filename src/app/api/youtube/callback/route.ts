import { NextRequest, NextResponse } from 'next/server'
import {
  validateYouTubeState,
  exchangeYouTubeCode,
  storeYouTubeTokens,
  YT_OAUTH_STATE_COOKIE,
  ytOAuthStateCookieOptions,
  isYouTubeConfigured,
} from '@/lib/youtube-oauth'
import { getSessionUser } from '@/lib/auth'
import { syncYouTubeData } from '@/lib/youtube-sync'
import { db } from '@/lib/db'

// GET /api/youtube/callback?code=...&state=...
// Completes the YouTube OAuth flow:
//   1. Validate the user is still logged in (the session that started the
//      flow must still be active).
//   2. Validate the `state` query param against the state cookie (CSRF).
//   3. Exchange the authorization code for access + refresh tokens.
//   4. Persist the tokens to the YoutubeToken table.
//   5. Trigger an initial sync of the user's channel(s) + videos + playlists.
//   6. Create a "YouTube connected" notification.
//   7. Clear the state cookie and redirect to /settings.
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const settingsUrl = new URL('/', appUrl)
  settingsUrl.searchParams.set('yt', 'connected')

  // 1. Verify the user is logged in.
  const user = await getSessionUser()
  if (!user) {
    settingsUrl.searchParams.delete('yt')
    settingsUrl.searchParams.set('yt', 'auth_required')
    return NextResponse.redirect(settingsUrl)
  }

  if (!isYouTubeConfigured()) {
    settingsUrl.searchParams.set('yt', 'not_configured')
    return NextResponse.redirect(settingsUrl)
  }

  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const err = searchParams.get('error')

  // User denied consent.
  if (err) {
    settingsUrl.searchParams.set(
      'yt',
      err === 'access_denied' ? 'denied' : 'error'
    )
    return NextResponse.redirect(settingsUrl)
  }
  if (!code || !state) {
    settingsUrl.searchParams.set('yt', 'invalid_callback')
    return NextResponse.redirect(settingsUrl)
  }

  // 2. Validate state (CSRF).
  const stateOk = await validateYouTubeState(state)
  if (!stateOk) {
    settingsUrl.searchParams.set('yt', 'state_mismatch')
    return NextResponse.redirect(settingsUrl)
  }

  // 3. Exchange code for tokens.
  const tokens = await exchangeYouTubeCode(code)
  if (!tokens) {
    settingsUrl.searchParams.set('yt', 'token_exchange_failed')
    return NextResponse.redirect(settingsUrl)
  }

  // 4. Persist tokens.
  try {
  await storeYouTubeTokens(user.id, tokens)
} catch (e) {
  console.error("storeYouTubeTokens failed:", e)
  throw e
}

  // 5. Trigger initial sync (best-effort — if it fails, the user can use
  //    the "Sync Now" button in settings).
  let syncOk = true
  try {
    await syncYouTubeData(user.id)
  } catch (e) {
    console.error('[youtube/callback] initial sync failed', e)
    syncOk = false
  }

  // 6. Create a notification.
  await db.notification.create({
    data: {
      userId: user.id,
      type: 'system',
      title: 'YouTube channel connected',
      message: syncOk
        ? 'Your YouTube channel has been connected and synced successfully.'
        : 'Your YouTube channel was connected, but the initial sync failed. Use "Sync Now" in Settings.',
      read: false,
    },
  })

  // 7. Clear state cookie + redirect.
  const res = NextResponse.redirect(settingsUrl)
  res.cookies.set(YT_OAUTH_STATE_COOKIE, '', { ...ytOAuthStateCookieOptions(), maxAge: 0 })
  if (!syncOk) {
    settingsUrl.searchParams.set('yt', 'partial')
  }
  return res
}
