import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { consumeToken } from '@/lib/tokens'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6).max(120),
})

// POST /api/auth/reset-password
// Consumes a password_reset token, validates the new password length,
// hashes it, updates the user's passwordHash, and deletes all of the
// user's sessions so they must sign in again.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = resetPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }
    const { token, newPassword } = parsed.data

    const result = await consumeToken(token, 'password_reset')
    if (!result) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired.' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(newPassword)
    await db.user.update({
      where: { id: result.userId },
      data: { passwordHash },
    })

    // Force re-login on every device by destroying all sessions for this user.
    await db.session.deleteMany({ where: { userId: result.userId } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reset-password] error', err)
    return NextResponse.json(
      { error: 'Password reset failed.' },
      { status: 500 }
    )
  }
}
