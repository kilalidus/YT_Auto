import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: { userId: string; date?: { gte?: Date; lte?: Date } } = {
      userId: user.id,
    }
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }

    const events = await db.contentEvent.findMany({
      where,
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({ events })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[events GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
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
    if (!body.date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const event = await db.contentEvent.create({
      data: {
        userId: user.id,
        title,
        date: new Date(body.date),
        type: body.type ?? 'publish',
        status: body.status ?? 'planned',
        notes: body.notes ?? '',
        projectId: body.projectId ?? null,
      },
      include: { project: { select: { id: true, name: true, color: true } } },
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[events POST] error', err)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
