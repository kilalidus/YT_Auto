import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser()
    const projects = await db.project.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { tasks: true, notes: true, files: true } },
        channel: { select: { id: true, title: true, thumbnail: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ projects })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[projects GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const name = (body.name ?? '').toString().trim()
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        userId: user.id,
        name,
        description: body.description ?? '',
        color: body.color ?? '#f43f5e',
        status: body.status ?? 'active',
        channelId: body.channelId ?? null,
      },
      include: {
        _count: { select: { tasks: true, notes: true, files: true } },
      },
    })
    return NextResponse.json({ project }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[projects POST] error', err)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
