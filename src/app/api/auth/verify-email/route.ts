import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { consumeToken } from '@/lib/tokens'
import { z } from 'zod'

const verifyEmailSchema = z.object({
  token: z.string().min(1),
})

// POST /api/auth/verify-email
// Consumes an email_verify token and marks the user's email as verified.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = verifyEmailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid verification token.' },
        { status: 400 }
      )
    }
    const { token } = parsed.data

    const result = await consumeToken(token, 'email_verify')
    if (!result) {
      return NextResponse.json(
        { error: 'This verification link is invalid or has expired.' },
        { status: 400 }
      )
    }

    await db.user.update({
      where: { id: result.userId },
      data: { emailVerified: true },
    })

    return NextResponse.json({ ok: true, user: { emailVerified: true } })
  } catch (err) {
    console.error('[verify-email] error', err)
    return NextResponse.json(
      { error: 'Email verification failed.' },
      { status: 500 }
    )
  }
}
