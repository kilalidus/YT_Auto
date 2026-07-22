import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createToken } from '@/lib/tokens'
import { z } from 'zod'

const requestResetSchema = z.object({
  email: z.string().email(),
})

// POST /api/auth/request-reset
// Always returns 200 to avoid leaking which emails have accounts.
// In this sandboxed environment the reset link is returned to the UI
// so the user can "click the email link" — in production this would
// send an email via an SMTP/transactional email provider.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = requestResetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: true })
    }
    const { email } = parsed.data

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      // Don't leak which emails exist — still return ok
      // TODO: in production, queue a "no-account" email here too
      return NextResponse.json({ ok: true })
    }

    const { token } = await createToken(user.id, 'password_reset')
    const demoLink = `/?mode=reset-password&token=${token}`

    // TODO: in production, send an email here with the reset link.
    // e.g. await sendEmail(user.email, 'Reset your password', resetLinkHtml)
    // For this sandboxed demo, we return the link so the UI can show it.

    return NextResponse.json({ ok: true, demoLink })
  } catch (err) {
    console.error('[request-reset] error', err)
    // Still 200 to avoid leaking state
    return NextResponse.json({ ok: true })
  }
}
