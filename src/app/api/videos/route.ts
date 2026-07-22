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
    const channelId = searchParams.get('channelId')
    const shorts = searchParams.get('shorts')

    const where: { userId: string; channelId?: string; isShort?: boolean } = {
      userId: user.id,
    }
    if (channelId) where.channelId = channelId
    if (shorts === 'true') where.isShort = true

    const videos = await db.video.findMany({
      where,
      include: { channel: { select: { id: true, title: true, thumbnail: true } } },
      orderBy: { publishedAt: 'desc' },
    })

    const parsed = videos.map((v) => ({
      ...v,
      tags: parseJSON(v.tags, []),
    }))

    return NextResponse.json({ videos: parsed })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[videos GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
  }
}
