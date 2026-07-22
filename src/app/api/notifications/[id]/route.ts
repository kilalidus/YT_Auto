import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const existing = await db.notification.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.read !== undefined) data.read = Boolean(body.read)

    const notification = await db.notification.update({ where: { id }, data })
    return NextResponse.json({ notification })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[notification PATCH] error', err)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await db.notification.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    await db.notification.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[notification DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }
}
