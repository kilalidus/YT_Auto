import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

const VALID_STATUSES = ['new', 'approved', 'held', 'spam', 'hidden']
const VALID_SENTIMENTS = ['positive', 'neutral', 'negative']

function serialize(c: {
  id: string
  author: string
  authorAvatar: string | null
  text: string
  likeCount: number
  replyCount: number
  sentiment: string
  status: string
  publishedAt: Date
  createdAt: Date
  video: { id: string; title: string }
}) {
  return {
    id: c.id,
    author: c.author,
    authorAvatar: c.authorAvatar ?? null,
    text: c.text,
    likeCount: c.likeCount,
    replyCount: c.replyCount,
    sentiment: c.sentiment as 'positive' | 'neutral' | 'negative',
    status: c.status as 'new' | 'approved' | 'held' | 'spam' | 'hidden',
    publishedAt: c.publishedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    video: { id: c.video.id, title: c.video.title },
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

    const existing = await db.comment.findFirst({
      where: { id, userId: user.id },
      include: { video: { select: { id: true, title: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.status !== undefined && VALID_STATUSES.includes(body.status)) {
      data.status = body.status
    }
    if (body.sentiment !== undefined && VALID_SENTIMENTS.includes(body.sentiment)) {
      data.sentiment = body.sentiment
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ comment: serialize(existing) })
    }

    const updated = await db.comment.update({
      where: { id },
      data,
      include: { video: { select: { id: true, title: true } } },
    })
    return NextResponse.json({ comment: serialize(updated) })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[comment PATCH] error', err)
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await db.comment.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    await db.comment.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[comment DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
