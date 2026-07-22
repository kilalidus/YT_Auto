import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser()
    const folders = await db.folder.findMany({
      where: { userId: user.id },
      include: { _count: { select: { notes: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ folders })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[folders GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
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

    const folder = await db.folder.create({
      data: {
        userId: user.id,
        name,
        color: body.color ?? '#64748b',
      },
    })
    return NextResponse.json({ folder }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[folders POST] error', err)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}
