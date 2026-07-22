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
    const folderId = searchParams.get('folderId')
    const projectId = searchParams.get('projectId')
    const archived = searchParams.get('archived')
    const q = searchParams.get('q')?.trim()

    const where: {
      userId: string
      archived?: boolean
      folderId?: string | null
      projectId?: string | null
      OR?: Array<Record<string, unknown>>
    } = { userId: user.id }

    if (archived === 'true') where.archived = true
    else if (archived === 'false') where.archived = false

    if (folderId === 'null') where.folderId = null
    else if (folderId) where.folderId = folderId

    if (projectId === 'null') where.projectId = null
    else if (projectId) where.projectId = projectId

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
      ]
    }

    const notes = await db.note.findMany({
      where,
      include: {
        folder: { select: { id: true, name: true, color: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    })

    const parsed = notes.map((n) => ({
      ...n,
      tags: parseJSON(n.tags, []),
    }))

    return NextResponse.json({ notes: parsed })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[notes GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
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

    const note = await db.note.create({
      data: {
        userId: user.id,
        title,
        content: body.content ?? '',
        tags: JSON.stringify(body.tags ?? []),
        pinned: Boolean(body.pinned ?? false),
        favorited: Boolean(body.favorited ?? false),
        archived: Boolean(body.archived ?? false),
        folderId: body.folderId ?? null,
        projectId: body.projectId ?? null,
        channelId: body.channelId ?? null,
      },
      include: {
        folder: { select: { id: true, name: true, color: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json(
      { note: { ...note, tags: parseJSON(note.tags, []) } },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[notes POST] error', err)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
