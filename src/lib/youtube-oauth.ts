import { db } from '@/lib/db'
import { randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

// ---------------------------------------------------------------------------
// YouTube OAuth — real Google OAuth 2.0 authorization-code flow with YouTube
// Data API v3 + YouTube Analytics scopes. Reuses the same Google OAuth client
// as sign-in (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) but requests different
// scopes and uses a separate redirect URI + state cookie.
//
// Flow:
//   1. Authenticated user clicks "Connect YouTube Channel" in Settings.
//   2. Browser → GET /api/youtube/connect
//      → server generates random `state`, stores in short-lived cookie, 302s
//        to Google consent screen with scopes:
//          - https://www.googleapis.com/auth/youtube.readonly
//          - https://www.googleapis.com/auth/yt-analytics.readonly
//   3. User consents → Google redirects to /api/youtube/callback?code=...&state=...
//   4. Server validates state, exchanges code for access+refresh tokens,
//      persists them to the YoutubeToken table (one row per user, upserted),
//      triggers an initial sync, and 302s to /settings.
// ---------------------------------------------------------------------------

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// YouTube-specific scopes:
//   youtube.readonly       — read channel info, videos, playlists, comments
//   yt-analytics.readonly  — read watch-time / audience analytics
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
].join(' ')

// Short-lived state cookie for CSRF protection during the YouTube OAuth flow.
// Distinct name from the sign-in OAuth state cookie so the two flows don't
// collide.
export const YT_OAUTH_STATE_COOKIE = 'ytflow_yt_oauth_state'
const YT_OAUTH_STATE_TTL_SEC = 10 * 60 // 10 minutes

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/youtube/callback`
  return { clientId, clientSecret, redirectUri, appUrl }
}

export function isYouTubeConfigured(): boolean {
  const { clientId, clientSecret } = getGoogleConfig()
  return Boolean(clientId && clientSecret)
}

export function buildYouTubeAuthUrl(): { url: string; state: string } {
  const { clientId, redirectUri } = getGoogleConfig()
  const state = randomBytes(16).toString('hex')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES,
    access_type: 'offline', // request a refresh token
    include_granted_scopes: 'true',
    state,
    prompt: 'consent', // force consent so we always get a fresh refresh token
  })
  return { url: `${GOOGLE_AUTH_URL}?${params.toString()}`, state }
}

export async function validateYouTubeState(stateFromQuery: string): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const stored = cookieStore.get(YT_OAUTH_STATE_COOKIE)?.value
    if (!stored) return false
    const a = Buffer.from(stateFromQuery)
    const b = Buffer.from(stored)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function ytOAuthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: YT_OAUTH_STATE_TTL_SEC,
  }
}

export interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number // seconds
  token_type: string
  scope: string
}

// Exchange the authorization code for access + refresh tokens.
export async function exchangeYouTubeCode(code: string): Promise<GoogleTokenResponse | null> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig()
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    console.error('[youtube] token exchange failed', res.status, await res.text())
    return null
  }
  return (await res.json()) as GoogleTokenResponse
}

// Refresh an expired access token using the stored refresh token.
export async function refreshYouTubeAccessToken(refreshToken: string): Promise<GoogleTokenResponse | null> {
  const { clientId, clientSecret } = getGoogleConfig()
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  })
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    console.error('[youtube] token refresh failed', res.status, await res.text())
    return null
  }
  return (await res.json()) as GoogleTokenResponse
}

// ---------------------------------------------------------------------------
// Token storage + retrieval. One row per user (upserted on re-connect).
// ---------------------------------------------------------------------------

export async function storeYouTubeTokens(
  userId: string,
  tokens: GoogleTokenResponse
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
  // Delete any existing tokens for this user (single row policy) then insert.
  await db.youtubeToken.deleteMany({ where: { userId } })
  await db.youtubeToken.create({
    data: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenType: tokens.token_type || 'Bearer',
      scope: tokens.scope || '',
      expiresAt,
    },
  })
}

export async function deleteYouTubeTokens(userId: string): Promise<void> {
  await db.youtubeToken.deleteMany({ where: { userId } })
}

// Get a valid access token for the user, refreshing if necessary.
// Returns null if no tokens are stored or refresh fails.
export async function getValidYouTubeAccessToken(userId: string): Promise<string | null> {
  const token = await db.youtubeToken.findFirst({ where: { userId } })
  if (!token) return null

  // If the access token is still valid (with a 60s safety margin), use it.
  const safetyMargin = 60 * 1000
  if (token.expiresAt.getTime() > Date.now() + safetyMargin) {
    return token.accessToken
  }

  // Otherwise, refresh using the stored refresh token.
  if (!token.refreshToken) return null
  const refreshed = await refreshYouTubeAccessToken(token.refreshToken)
  if (!refreshed) return null

  // Persist the new access token (refresh_token is NOT returned on refresh,
  // so we keep the existing one).
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000)
  await db.youtubeToken.update({
    where: { id: token.id },
    data: {
      accessToken: refreshed.access_token,
      expiresAt,
      scope: refreshed.scope || token.scope,
    },
  })
  return refreshed.access_token
}
