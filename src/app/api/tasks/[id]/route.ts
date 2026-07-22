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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const existing = await db.workflowTask.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.description !== undefined) data.description = body.description
    if (body.status !== undefined) data.status = body.status
    if (body.priority !== undefined) data.priority = body.priority
    if (body.order !== undefined) data.order = Number(body.order) || 0
    if (body.completed !== undefined) data.completed = Boolean(body.completed)
    if (body.projectId !== undefined) {
      data.projectId = body.projectId === null ? null : body.projectId
    }
    if (body.deadline !== undefined) {
      data.deadline = body.deadline ? new Date(body.deadline) : null
    }
    if (body.labels !== undefined) {
      data.labels = JSON.stringify(Array.isArray(body.labels) ? body.labels : [])
    }

    const task = await db.workflowTask.update({
      where: { id },
      data,
      include: { project: { select: { id: true, name: true, color: true } } },
    })

    return NextResponse.json({ task: { ...task, labels: parseJSON(task.labels, []) } })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[task PATCH] error', err)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await db.workflowTask.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await db.workflowTask.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[task DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
