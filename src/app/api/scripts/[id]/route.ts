import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

function parseJSON(value: string | null | undefined, fallback: unknown = {}) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
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

    const existing = await db.script.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.type !== undefined) data.type = body.type
    if (body.content !== undefined) data.content = body.content
    if (body.projectId !== undefined) {
      data.projectId = body.projectId === null ? null : body.projectId
    }
    if (body.metadata !== undefined) data.metadata = JSON.stringify(body.metadata)

    const script = await db.script.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      script: { ...script, metadata: parseJSON(script.metadata, {}) },
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[script PATCH] error', err)
    return NextResponse.json({ error: 'Failed to update script' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await db.script.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 })
    }

    await db.script.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[script DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete script' }, { status: 500 })
  }
}
