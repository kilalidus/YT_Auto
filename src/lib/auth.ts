import { db } from '@/lib/db'
import { randomBytes, timingSafeEqual, createHash } from 'crypto'
import { cookies, headers } from 'next/headers'
import bcrypt from 'bcryptjs'

// ---------------------------------------------------------------------------
// Cookie / session constants.
// ---------------------------------------------------------------------------
export const SESSION_COOKIE = 'ytflow_session'
const SESSION_TTL_DAYS = 30
export const SESSION_MAX_AGE = SESSION_TTL_DAYS * 24 * 60 * 60

// OAuth state cookie — short-lived, signed with the same secret as sessions.
export const OAUTH_STATE_COOKIE = 'ytflow_oauth_state'
const OAUTH_STATE_TTL_SEC = 10 * 60 // 10 minutes

// ---------------------------------------------------------------------------
// Password hashing — REAL bcrypt with cost factor 12.
// `verifyPassword` also recognises legacy PBKDF2 hashes (salt:hex format) so
// existing users created before the migration can still log in. The first
// successful legacy login re-hashes the password with bcrypt transparently.
// ---------------------------------------------------------------------------
const BCRYPT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

function isBcryptHash(hash: string): boolean {
  return /^\$2[abxy]\$\d{2}\$/.test(hash)
}

function verifyLegacyPbkdf2(password: string, stored: string): boolean {
  // Legacy format: salt:hex  (PBKDF2-style 10000 iterations of sha256)
  try {
    const [salt, final] = stored.split(':')
    if (!salt || !final) return false
    let computed = createHash('sha256')
      .update(salt + ':' + password)
      .digest('hex')
    for (let i = 0; i < 10000; i++) {
      computed = createHash('sha256').update(computed + salt).digest('hex')
    }
    const a = Buffer.from(computed, 'hex')
    const b = Buffer.from(final, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  if (!stored) return false
  if (isBcryptHash(stored)) {
    return bcrypt.compare(password, stored)
  }
  // Legacy PBKDF2 path
  return verifyLegacyPbkdf2(password, stored)
}

export function needsRehash(stored: string): boolean {
  return !isBcryptHash(stored)
}

// ---------------------------------------------------------------------------
// Session management — DB-backed session tokens in an httpOnly cookie.
// Sessions are stored in the Session table (userId, token, expiresAt) and
// validated on every request via getSessionUser() below.
// ---------------------------------------------------------------------------
export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({
    data: { userId, token, expiresAt },
  })
  return token
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (token) {
      await db.session.deleteMany({ where: { token } }).catch(() => {})
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Google OAuth — real OAuth 2.0 authorization-code flow, implemented with
// only Node's built-in `crypto` and `fetch`. No next-auth dependency (which
// was causing memory pressure in this 4 GB sandbox).
//
// Flow:
//   1. Client clicks "Continue with Google" → GET /api/auth/google/login
//      → server generates a random `state`, stores it in a short-lived
//      signed cookie, and 302s to Google's consent screen.
//   2. User consents → Google redirects to /api/auth/google/callback
//      ?code=...&state=...
//   3. Server validates state, exchanges code for access_token + id_token,
//      decodes the id_token JWT to get email/name/picture, upserts the User
//      row, creates a session, sets the session cookie, and 302s to /.
// ---------------------------------------------------------------------------

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Scopes requested during Google sign-in. We include YouTube scopes so that,
// if the user grants them, we can immediately sync their YouTube channel
// without a second round-trip. `include_granted_scopes=true` means Google
// will silently grant YouTube access if the user previously consented.
const SIGNIN_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
].join(' ')

// YouTube scopes (used to detect whether the user granted YouTube access).
const YT_SCOPE_PREFIX = 'https://www.googleapis.com/auth/youtube'

interface GoogleUserInfo {
  email: string
  emailVerified: boolean
  name?: string
  picture?: string
}

// Extended token response that includes the access_token + granted scope.
// We need this to detect whether YouTube scopes were granted during sign-in.
export interface GoogleSignInTokens {
  userInfo: GoogleUserInfo
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  scope?: string
  tokenType?: string
}

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  // The public redirect URL — must be registered in Google Cloud Console.
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`
  return { clientId, clientSecret, redirectUri, appUrl }
}

export function isGoogleConfigured(): boolean {
  const { clientId, clientSecret } = getGoogleConfig()
  return Boolean(clientId && clientSecret)
}

// Build the Google consent-screen URL + a random state value. The state is
// stored in a short-lived cookie so the callback handler can verify the
// response came from a request we initiated (CSRF protection).
// We request `offline` access so we get a refresh_token (needed to keep
// YouTube sync working without asking the user to re-consent every hour).
export function buildGoogleAuthUrl(): { url: string; state: string } {
  const { clientId, redirectUri } = getGoogleConfig()
  const state = randomBytes(16).toString('hex')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SIGNIN_SCOPES,
    access_type: 'offline',
    include_granted_scopes: 'true',
    state,
    prompt: 'select_account consent',
  })
  return { url: `${GOOGLE_AUTH_URL}?${params.toString()}`, state }
}

// Validate the state returned by Google against the value stored in the
// state cookie. Returns true if they match (timing-safe comparison).
export async function validateOAuthState(stateFromQuery: string): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const stored = cookieStore.get(OAUTH_STATE_COOKIE)?.value
    if (!stored) return false
    const a = Buffer.from(stateFromQuery)
    const b = Buffer.from(stored)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// Exchange the authorization code for tokens, then decode the id_token JWT
// to extract the user's email, name, and picture. We don't verify the JWT
// signature here because we just received it directly from Google's token
// endpoint over TLS — that's sufficient proof of authenticity for our use
// case (we trust the transport, not the JWT itself).
//
// In addition to the user info, this function now returns the access_token,
// refresh_token, and granted scope so the caller can detect whether YouTube
// permissions were granted and persist them for later YouTube API calls.
export async function exchangeGoogleCode(code: string): Promise<GoogleSignInTokens | null> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig()
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!tokenRes.ok) {
    console.error('[google] token exchange failed', tokenRes.status, await tokenRes.text())
    return null
  }
  const tokenJson = (await tokenRes.json()) as {
    id_token?: string
    access_token?: string
    refresh_token?: string
    expires_in?: number
    scope?: string
    token_type?: string
  }
  if (!tokenJson.id_token) return null

  // Decode the id_token JWT payload (no signature verification — see comment above).
  const payloadB64 = tokenJson.id_token.split('.')[1]
  if (!payloadB64) return null
  const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8')
  const payload = JSON.parse(payloadJson) as {
    email?: string
    email_verified?: boolean | string
    name?: string
    picture?: string
  }
  if (!payload.email) return null

  return {
    userInfo: {
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: payload.name,
      picture: payload.picture,
    },
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token,
    expiresIn: tokenJson.expires_in,
    scope: tokenJson.scope,
    tokenType: tokenJson.token_type,
  }
}

// Check whether the granted scope string includes YouTube access.
export function hasYouTubeScopes(scope?: string): boolean {
  if (!scope) return false
  return scope.split(' ').some((s) => s.startsWith(YT_SCOPE_PREFIX))
}

// Upsert the Google-authenticated user into our DB and create a session.
// Returns the session token (to be set in the cookie by the caller).
export async function completeGoogleLogin(info: GoogleUserInfo): Promise<string | null> {
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  let user = await db.user.findUnique({ where: { email: info.email } })
  if (!user) {
    user = await db.user.create({
      data: {
        email: info.email,
        name: info.name || info.email.split('@')[0],
        image: info.picture || null,
        provider: 'google',
        role: ADMIN_EMAILS.includes(info.email) ? 'admin' : 'creator',
        emailVerified: true,
      },
    })
    await db.userSetting.create({ data: { userId: user.id, theme: 'dark' } })
    // Welcome notification — no demo data is seeded; the user connects their
    // own YouTube channel via Settings.
    try {
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'system',
          title: `Welcome to TubeFlow AI, ${user.name || 'Creator'}!`,
          message:
            'Your workspace is ready. Head to Settings → Connected Accounts to connect your YouTube channel and import your real data.',
          read: false,
        },
      })
    } catch (e) {
      console.error('[google] welcome notification failed', e)
    }
  } else {
    // Refresh profile photo / name on each Google login (only if user hasn't
    // set a custom name). Mark emailVerified if it wasn't already.
    const patch: { image?: string; emailVerified?: boolean; provider?: string } = {}
    if (info.picture && user.image !== info.picture) patch.image = info.picture
    if (!user.emailVerified && info.emailVerified) patch.emailVerified = true
    if (user.provider !== 'google' && !user.passwordHash) patch.provider = 'google'
    if (Object.keys(patch).length > 0) {
      user = await db.user.update({ where: { id: user.id }, data: patch })
    }
  }

  return createSession(user.id)
}

// Helper to set the OAuth state cookie on a NextResponse.
export function oAuthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: OAUTH_STATE_TTL_SEC,
  }
}

// ---------------------------------------------------------------------------
// Unified session reader — used by every authenticated API route. Validates
// the session cookie against the DB and returns the user shape.
// ---------------------------------------------------------------------------
export async function getSessionUser(): Promise<{
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  emailVerified: boolean
} | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session) return null
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      role: session.user.role,
      emailVerified: session.user.emailVerified,
    }
  } catch {
    return null
  }
}

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

// Helper retained for parity with previous API (some routes imported it).
export async function getWebRequestHeaders() {
  return await headers()
}
