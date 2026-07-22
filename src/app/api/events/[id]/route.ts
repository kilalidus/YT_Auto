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

    const existing = await db.contentEvent.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.type !== undefined) data.type = body.type
    if (body.status !== undefined) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes
    if (body.date !== undefined) data.date = new Date(body.date)
    if (body.projectId !== undefined) {
      data.projectId = body.projectId === null ? null : body.projectId
    }

    const event = await db.contentEvent.update({
      where: { id },
      data,
      include: { project: { select: { id: true, name: true, color: true } } },
    })
    return NextResponse.json({ event })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[event PATCH] error', err)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await db.contentEvent.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    await db.contentEvent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[event DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
