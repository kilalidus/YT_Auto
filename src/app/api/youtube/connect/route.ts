import { NextResponse } from 'next/server'
import {
  buildYouTubeAuthUrl,
  isYouTubeConfigured,
  ytOAuthStateCookieOptions,
  YT_OAUTH_STATE_COOKIE,
} from '@/lib/youtube-oauth'
import { requireUser } from '@/lib/auth'

// GET /api/youtube/connect
// Initiates the YouTube OAuth flow. Requires an authenticated session (the
// user must be logged in to connect their YouTube channel). Generates a CSRF
// state value, stores it in a short-lived cookie, and 302s to Google's
// consent screen requesting youtube.readonly + yt-analytics.readonly scopes.
export async function GET() {
  try {
    // Verify the user is logged in. This returns 401 if not.
    await requireUser()

    if (!isYouTubeConfigured()) {
      return NextResponse.json(
        {
          error:
            'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable YouTube connection.',
        },
        { status: 400 }
      )
    }

    const { url, state } = buildYouTubeAuthUrl()
    const res = NextResponse.redirect(url)
    res.cookies.set(YT_OAUTH_STATE_COOKIE, state, ytOAuthStateCookieOptions())
    return res
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[youtube/connect] error', err)
    return NextResponse.json(
      { error: 'Failed to start YouTube OAuth flow' },
      { status: 500 }
    )
  }
}
