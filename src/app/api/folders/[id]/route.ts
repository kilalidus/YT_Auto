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

    const existing = await db.folder.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.color !== undefined) data.color = body.color

    const folder = await db.folder.update({ where: { id }, data })
    return NextResponse.json({ folder })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[folder PATCH] error', err)
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await db.folder.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Detach notes (folderId set to null via onDelete: SetNull in schema)
    await db.note.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    })
    await db.folder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[folder DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
  }
}
