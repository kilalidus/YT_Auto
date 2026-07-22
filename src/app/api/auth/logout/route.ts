import { NextResponse } from 'next/server'
import { destroySession, SESSION_COOKIE } from '@/lib/auth'

// Logout — destroys the DB-backed session and clears the session cookie.
export async function POST() {
  await destroySession()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
