import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  needsRehash,
  hashPassword,
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from '@/lib/auth'
import { getValidYouTubeAccessToken } from '@/lib/youtube-oauth'
import { syncYouTubeData } from '@/lib/youtube-sync'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Real email + password login:
//  1. Validate the form.
//  2. Look up the user by email.
//  3. If the user has no password (e.g. Google-only account) → 401.
//  4. Verify the password with bcrypt (auto-detects legacy PBKDF2 hashes).
//  5. If invalid → 401 (NEVER log the user in).
//  6. Transparently upgrade legacy hashes to bcrypt on successful login.
//  7. Create a session + set the cookie.
//  8. Return the user shape.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { email, password } = parsed.data
    const normalizedEmail = email.trim().toLowerCase()

    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Upgrade legacy PBKDF2 hash → bcrypt.
    if (needsRehash(user.passwordHash)) {
      const newHash = await hashPassword(password)
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      })
    }

    const token = await createSession(user.id)

    // If the user has YouTube connected, trigger a background sync so their
    // dashboard reflects the latest data from YouTube. We do NOT await this
    // — the login response returns immediately and the sync runs in the
    // background. We only trigger a sync if the last sync was more than
    // 15 minutes ago (to avoid hammering the YouTube API on rapid re-logins).
    try {
      const existingToken = await db.youtubeToken.findFirst({
        where: { userId: user.id },
        select: { id: true },
      })
      if (existingToken) {
        // Check the last sync timestamp on the user's channels.
        const lastSync = await db.channel.findFirst({
          where: { userId: user.id, connected: true },
          orderBy: { lastSyncedAt: 'desc' },
          select: { lastSyncedAt: true },
        })
        const stale =
          !lastSync?.lastSyncedAt ||
          Date.now() - lastSync.lastSyncedAt.getTime() > 15 * 60 * 1000
        if (stale) {
          // Fire-and-forget: validate token exists, then sync without blocking.
          getValidYouTubeAccessToken(user.id)
            .then((at) => at && syncYouTubeData(user.id))
            .catch((e) =>
              console.error('[login] background YouTube sync failed', e)
            )
        }
      }
    } catch (e) {
      console.error('[login] YouTube auto-sync check failed', e)
    }

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
    })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })
    return res
  } catch (err) {
    console.error('[login] error', err)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
