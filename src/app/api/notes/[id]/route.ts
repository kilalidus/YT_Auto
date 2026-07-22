import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

function parseJSON(value: string | null | undefined, fallback: unknown = []) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const note = await db.note.findFirst({
      where: { id, userId: user.id },
      include: {
        folder: { select: { id: true, name: true, color: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json({ note: { ...note, tags: parseJSON(note.tags, []) } })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[note GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const existing = await db.note.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.content !== undefined) data.content = body.content
    if (body.pinned !== undefined) data.pinned = Boolean(body.pinned)
    if (body.favorited !== undefined) data.favorited = Boolean(body.favorited)
    if (body.archived !== undefined) data.archived = Boolean(body.archived)
    if (body.folderId !== undefined) {
      data.folderId = body.folderId === null ? null : body.folderId
    }
    if (body.projectId !== undefined) {
      data.projectId = body.projectId === null ? null : body.projectId
    }
    if (body.tags !== undefined) {
      data.tags = JSON.stringify(Array.isArray(body.tags) ? body.tags : [])
    }

    const note = await db.note.update({
      where: { id },
      data,
      include: {
        folder: { select: { id: true, name: true, color: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json({ note: { ...note, tags: parseJSON(note.tags, []) } })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[note PATCH] error', err)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await db.note.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await db.note.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[note DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
