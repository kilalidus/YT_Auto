import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    const where: { userId: string; projectId?: string | null } = { userId: user.id }
    if (projectId === 'null') where.projectId = null
    else if (projectId) where.projectId = projectId

    const files = await db.fileAsset.findMany({
      where,
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ files })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[files GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
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

    const mimeType = (body.mimeType ?? '').toString()
    let type = (body.type ?? '').toString()
    if (!type) {
      if (mimeType.startsWith('image/')) type = 'image'
      else if (mimeType.startsWith('video/')) type = 'video'
      else if (mimeType.startsWith('audio/')) type = 'audio'
      else type = 'document'
    }

    const file = await db.fileAsset.create({
      data: {
        userId: user.id,
        name,
        type,
        mimeType,
        size: Number(body.size ?? 0) || 0,
        url: body.url ?? '',
        projectId: body.projectId ?? null,
      },
    })

    return NextResponse.json({ file }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[files POST] error', err)
    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 })
  }
}
