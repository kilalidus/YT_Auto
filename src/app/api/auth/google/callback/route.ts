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

export async function GET(req: NextRequest) {
  try {
    console.log('========== GOOGLE CALLBACK START ==========')

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

    if (err) {
      home.searchParams.set(
        'auth_error',
        err === 'access_denied' ? 'denied' : 'google_error'
      )
      return NextResponse.redirect(home)
    }

    if (!code || !state) {
      home.searchParams.set('auth_error', 'invalid_callback')
      return NextResponse.redirect(home)
    }

    console.log('STEP 1 - validate state')

    const stateOk = await validateOAuthState(state)

    if (!stateOk) {
      home.searchParams.set('auth_error', 'state_mismatch')
      return NextResponse.redirect(home)
    }

    console.log('STEP 2 - exchange code')

    const tokens = await exchangeGoogleCode(code)

    if (!tokens || !tokens.userInfo || !tokens.userInfo.email) {
      home.searchParams.set('auth_error', 'token_exchange_failed')
      return NextResponse.redirect(home)
    }

    console.log('STEP 3 - complete login')

    const sessionToken = await completeGoogleLogin(tokens.userInfo)

    console.log('STEP 4 - session token created')

    if (!sessionToken) {
      home.searchParams.set('auth_error', 'session_failed')
      return NextResponse.redirect(home)
    }

    console.log('STEP 5 - lookup user')

    const user = await db.user.findUnique({
      where: {
        email: tokens.userInfo.email,
      },
      select: {
        id: true,
        name: true,
      },
    })

    console.log('STEP 6 - user', user)

    let ytSynced = false

    if (user && tokens.accessToken && hasYouTubeScopes(tokens.scope)) {
      try {
        console.log('STEP 7 - store YouTube tokens')

        await storeYouTubeTokens(user.id, {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_in: tokens.expiresIn ?? 3600,
          token_type: tokens.tokenType ?? 'Bearer',
          scope: tokens.scope ?? '',
        })

        console.log('STEP 8 - sync channel')

        await syncYouTubeData(user.id)

        console.log('STEP 9 - sync finished')

        ytSynced = true

        await db.notification.create({
          data: {
            userId: user.id,
            type: 'system',
            title: 'YouTube channel connected',
            message: `Welcome${
              user.name ? `, ${user.name}` : ''
            }! Your YouTube account was connected and your channel data has been synced automatically.`,
            read: false,
          },
        })

        console.log('STEP 10 - notification created')
      } catch (e) {
        console.error('========== YOUTUBE SYNC ERROR ==========')
        console.error(e)

        if (e instanceof Error) {
          console.error(e.message)
          console.error(e.stack)
        }
      }
    }

    if (ytSynced) {
      home.searchParams.set('yt', 'auto_synced')
    }

    console.log('STEP 11 - create response')

    const res = NextResponse.redirect(home)

    res.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    res.cookies.set(OAUTH_STATE_COOKIE, '', {
      ...oAuthStateCookieOptions(),
      maxAge: 0,
    })

    console.log('========== GOOGLE CALLBACK SUCCESS ==========')

    return res
  } catch (error) {
    console.error('========== GOOGLE CALLBACK FATAL ERROR ==========')
    console.error(error)

    if (error instanceof Error) {
      console.error('MESSAGE:', error.message)
      console.error('STACK:')
      console.error(error.stack)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}