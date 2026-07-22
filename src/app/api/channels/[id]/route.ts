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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const channel = await db.channel.findFirst({
      where: { id, userId: user.id },
      include: {
        videos: {
          orderBy: { publishedAt: 'desc' },
        },
        _count: { select: { videos: true } },
      },
    })
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const videos = channel.videos.map((v) => ({
      ...v,
      tags: parseJSON(v.tags, []),
    }))

    return NextResponse.json({ channel: { ...channel, videos } })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[channel GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch channel' }, { status: 500 })
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

    const existing = await db.channel.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    const fields = [
      'title',
      'description',
      'thumbnail',
      'customUrl',
      'youtubeChannelId',
      'country',
    ]
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f]
    }
    for (const f of ['subscriberCount', 'videoCount', 'viewCount', 'healthScore']) {
      if (body[f] !== undefined) data[f] = Number(body[f]) || 0
    }
    if (body.connected !== undefined) data.connected = Boolean(body.connected)
    if (body.publishedAt !== undefined) {
      data.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null
    }

    const channel = await db.channel.update({
      where: { id },
      data,
    })
    return NextResponse.json({ channel })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[channel PATCH] error', err)
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await db.channel.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    await db.channel.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[channel DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 })
  }
}
