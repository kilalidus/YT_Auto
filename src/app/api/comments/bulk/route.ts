import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

const VALID_ACTIONS = ['approve', 'hold', 'spam', 'hide', 'delete']

const ACTION_TO_STATUS: Record<string, string> = {
  approve: 'approved',
  hold: 'held',
  spam: 'spam',
  hide: 'hidden',
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const { ids, action } = body as { ids?: string[]; action?: string }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      )
    }
    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: 'action must be one of: approve, hold, spam, hide, delete' },
        { status: 400 }
      )
    }

    // User-scoped — only touch comments owned by this user
    const targets = await db.comment.findMany({
      where: { id: { in: ids }, userId: user.id },
      select: { id: true },
    })
    const targetIds = targets.map((t) => t.id)
    if (targetIds.length === 0) {
      return NextResponse.json({ updated: 0, action })
    }

    if (action === 'delete') {
      const result = await db.comment.deleteMany({
        where: { id: { in: targetIds }, userId: user.id },
      })
      return NextResponse.json({ updated: result.count, action })
    }

    const status = ACTION_TO_STATUS[action]
    const result = await db.comment.updateMany({
      where: { id: { in: targetIds }, userId: user.id },
      data: { status },
    })
    return NextResponse.json({ updated: result.count, action })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[comments bulk POST] error', err)
    return NextResponse.json({ error: 'Failed to apply bulk action' }, { status: 500 })
  }
}
