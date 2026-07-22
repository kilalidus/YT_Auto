import { NextResponse } from 'next/server'
import { buildGoogleAuthUrl, isGoogleConfigured, oAuthStateCookieOptions, OAUTH_STATE_COOKIE } from '@/lib/auth'

// GET /api/auth/google/login
// Initiates the real Google OAuth 2.0 authorization-code flow:
//   1. Generate a random `state` value (CSRF protection).
//   2. Store it in a short-lived httpOnly cookie.
//   3. 302 redirect to Google's consent screen.
//
// The user comes back to /api/auth/google/callback?code=...&state=... after
// consenting. If Google OAuth isn't configured (missing GOOGLE_CLIENT_ID /
// GOOGLE_CLIENT_SECRET env vars), return a 400 with an actionable error.
export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        error:
          'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment to enable Google sign-in.',
      },
      { status: 400 }
    )
  }

  const { url, state } = buildGoogleAuthUrl()
  const res = NextResponse.redirect(url)
  res.cookies.set(OAUTH_STATE_COOKIE, state, oAuthStateCookieOptions())
  return res
}
