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

    if (!tokens || !tokens.userInfo?.email) {
      home.searchParams.set('auth_error', 'token_exchange_failed')
      return NextResponse.redirect(home)
    }

    console.log('Google user:', tokens.userInfo.email)

    console.log('STEP 3 - complete login')

    const sessionToken = await completeGoogleLogin(tokens.userInfo)

    if (!sessionToken) {
      home.searchParams.set('auth_error', 'session_failed')
      return NextResponse.redirect(home)
    }

    console.log('Session token created')

    console.log('STEP 4 - verify database')

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
      },
    })

    console.log('Users in database:', users)

    console.log('STEP 5 - lookup current user')

    let user: {
      id: string
      name: string | null
    } | null = null

    try {
      user = await db.user.findFirst({
        where: {
          email: tokens.userInfo.email,
        },
        select: {
          id: true,
          name: true,
        },
      })

      console.log('Found user:', user)
    } catch (e) {
      console.error('findFirst failed')
      console.error(e)
      throw e
    }

    if (!user) {
      throw new Error(
        `User not found after completeGoogleLogin(): ${tokens.userInfo.email}`
      )
    }

    let ytSynced = false

    if (tokens.accessToken && hasYouTubeScopes(tokens.scope)) {
      try {
        console.log('STEP 6 - store youtube tokens')

        await storeYouTubeTokens(user.id, {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_in: tokens.expiresIn ?? 3600,
          token_type: tokens.tokenType ?? 'Bearer',
          scope: tokens.scope ?? '',
        })

        console.log('STEP 7 - sync youtube')

        await syncYouTubeData(user.id)

        ytSynced = true

        console.log('STEP 8 - create notification')

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

        console.log('Notification created')
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

    console.log('STEP 9 - create response')

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
    console.error('========== GOOGLE CALLBACK ERROR ==========')
    console.error(error)

    if (error instanceof Error) {
      console.error('Message:', error.message)
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