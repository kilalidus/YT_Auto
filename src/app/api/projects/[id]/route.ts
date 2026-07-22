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

    const existing = await db.project.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.description !== undefined) data.description = body.description
    if (body.color !== undefined) data.color = body.color
    if (body.status !== undefined) data.status = body.status
    if (body.channelId !== undefined) {
      data.channelId = body.channelId === null ? null : body.channelId
    }

    const project = await db.project.update({
      where: { id },
      data,
      include: {
        _count: { select: { tasks: true, notes: true, files: true } },
      },
    })
    return NextResponse.json({ project })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[project PATCH] error', err)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await db.project.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await db.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[project DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
