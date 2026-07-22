import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword,
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(120),
  password: z.string().min(6).max(120),
})

// Real registration — NO demo data is seeded. The user starts with an empty
// workspace and connects their real YouTube channel via Settings to populate
// channels, videos, and analytics.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { name, email, password } = parsed.data
    const normalizedEmail = email.trim().toLowerCase()

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash,
        provider: 'credentials',
        role: 'creator',
      },
    })

    await db.userSetting.create({
      data: { userId: user.id, theme: 'dark' },
    })

    // Welcome notification guiding the user to connect their YouTube channel.
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'system',
        title: `Welcome to TubeFlow AI, ${name}!`,
        message:
          'Your workspace is ready. Head to Settings → Connected Accounts to connect your YouTube channel and import your real data.',
        read: false,
      },
    })

    const token = await createSession(user.id)
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
    console.error('[register] error', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
