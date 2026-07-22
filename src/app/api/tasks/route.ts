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

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: { userId: string; status?: string } = { userId: user.id }
    if (status) where.status = status

    const tasks = await db.workflowTask.findMany({
      where,
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    })

    const parsed = tasks.map((t) => ({
      ...t,
      labels: parseJSON(t.labels, []),
    }))

    return NextResponse.json({ tasks: parsed })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[tasks GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const title = (body.title ?? '').toString().trim()
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const order =
      typeof body.order === 'number'
        ? body.order
        : await db.workflowTask.count({ where: { userId: user.id } })

    const task = await db.workflowTask.create({
      data: {
        userId: user.id,
        title,
        description: body.description ?? '',
        status: body.status ?? 'idea',
        priority: body.priority ?? 'medium',
        projectId: body.projectId ?? null,
        channelId: body.channelId ?? null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        labels: JSON.stringify(body.labels ?? []),
        order,
        completed: Boolean(body.completed ?? false),
      },
      include: { project: { select: { id: true, name: true, color: true } } },
    })

    return NextResponse.json(
      { task: { ...task, labels: parseJSON(task.labels, []) } },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[tasks POST] error', err)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
