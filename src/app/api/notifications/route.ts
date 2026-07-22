import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser()
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ notifications })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[notifications GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
