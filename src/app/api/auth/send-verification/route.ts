import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { createToken } from '@/lib/tokens'

// POST /api/auth/send-verification
// Requires an authenticated session (requireUser).
// If the user's email is already verified, returns alreadyVerified: true.
// Otherwise creates an email_verify token and returns a demoLink the UI
// surfaces in this sandboxed environment (in production, would send email).
export async function POST(_req: NextRequest) {
  try {
    const user = await requireUser()

    const existing = await db.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true },
    })
    if (existing?.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true })
    }

    const { token } = await createToken(user.id, 'email_verify')
    const demoLink = `/?mode=verify-email&token=${token}`

    // TODO: in production, send an email here with the verification link.
    // For this sandboxed demo, we return the link so the UI can show it.

    return NextResponse.json({ ok: true, demoLink })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[send-verification] error', err)
    return NextResponse.json(
      { error: 'Failed to send verification email.' },
      { status: 500 }
    )
  }
}
