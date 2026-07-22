import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public paths that don't require authentication:
//  - / and the assets it loads (favicon, etc.)
//  - Auth endpoints (/api/auth/*) — these are public by design (login, register,
//    google OAuth callback, password reset, email verification, etc.)
//  - YouTube OAuth callback (/api/youtube/callback) — Google redirects here
//    mid-flow; the handler itself verifies the user session + state cookie.
//  - Static assets
const PUBLIC_PATHS = [
  /^\/$/,
  /^\/_next\/.*/,
  /^\/favicon\.ico$/,
  /^\/api\/auth\/.*/,
  /^\/api\/youtube\/callback$/,
]

// In Next.js 16, the file formerly known as `middleware.ts` is `proxy.ts` and
// must export a function named `proxy` (or a default export). We use the named
// export here.
//
// This proxy protects every non-public route by requiring either the session
// cookie (ytflow_session) OR the OAuth state cookie (ytflow_oauth_state, used
// transiently during the Google OAuth flow). Unauthenticated requests to /api/*
// return 401 JSON; unauthenticated requests to other paths redirect to /.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths through.
  if (PUBLIC_PATHS.some((re) => re.test(pathname))) {
    return NextResponse.next()
  }

  // Check for a session cookie. The actual session validity is verified
  // server-side by getSessionUser() in each route handler; the proxy just
  // does a fast cookie-presence check to keep unauthenticated traffic out
  // of protected routes.
  const sessionCookie = req.cookies.get('ytflow_session')?.value
  const oauthStateCookie = req.cookies.get('ytflow_oauth_state')?.value

  if (sessionCookie || oauthStateCookie) {
    return NextResponse.next()
  }

  // Unauthenticated request to a protected resource.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Non-API routes — redirect to the login page (the `/` route renders the
  // AuthScreen when no session is present).
  return NextResponse.redirect(new URL('/', req.url))
}

export const config = {
  // Run on everything EXCEPT static assets, auth internals, and the YouTube
  // OAuth callback (which must be reachable by Google's redirect).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|api/youtube/callback).*)',
  ],
}
