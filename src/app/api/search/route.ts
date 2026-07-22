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
    const q = (searchParams.get('q') ?? '').trim()
    if (!q) {
      return NextResponse.json({
        videos: [],
        notes: [],
        projects: [],
        tasks: [],
        scripts: [],
      })
    }

    const [videos, notes, projects, tasks, scripts] = await Promise.all([
      db.video.findMany({
        where: {
          userId: user.id,
          OR: [{ title: { contains: q } }, { description: { contains: q } }],
        },
        include: { channel: { select: { id: true, title: true } } },
        orderBy: { publishedAt: 'desc' },
        take: 8,
      }),
      db.note.findMany({
        where: {
          userId: user.id,
          OR: [{ title: { contains: q } }, { content: { contains: q } }],
        },
        include: {
          folder: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, color: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
      db.project.findMany({
        where: {
          userId: user.id,
          OR: [{ name: { contains: q } }, { description: { contains: q } }],
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),
      db.workflowTask.findMany({
        where: {
          userId: user.id,
          OR: [{ title: { contains: q } }, { description: { contains: q } }],
        },
        include: { project: { select: { id: true, name: true, color: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      db.script.findMany({
        where: {
          userId: user.id,
          OR: [{ title: { contains: q } }, { content: { contains: q } }],
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ])

    return NextResponse.json({
      videos: videos.map((v) => ({ ...v, tags: parseJSON(v.tags, []) })),
      notes: notes.map((n) => ({ ...n, tags: parseJSON(n.tags, []) })),
      projects,
      tasks: tasks.map((t) => ({ ...t, labels: parseJSON(t.labels, []) })),
      scripts: scripts.map((s) => ({
        ...s,
        metadata: parseJSON(s.metadata, {}),
      })),
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[search GET] error', err)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}
