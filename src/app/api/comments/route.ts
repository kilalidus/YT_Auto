import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

const VALID_STATUSES = ['new', 'approved', 'held', 'spam', 'hidden']
const VALID_SENTIMENTS = ['positive', 'neutral', 'negative']

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const url = new URL(req.url)
    const status = url.searchParams.get('status') || 'all'
    const sentiment = url.searchParams.get('sentiment') || 'all'
    const videoId = url.searchParams.get('videoId') || ''
    const search = url.searchParams.get('search') || ''

    const where: {
      userId: string
      status?: string
      sentiment?: string
      videoId?: string
      OR?: Array<{ text?: { contains: string }; author?: { contains: string } }>
    } = { userId: user.id }

    if (status !== 'all' && VALID_STATUSES.includes(status)) {
      where.status = status
    }
    if (sentiment !== 'all' && VALID_SENTIMENTS.includes(sentiment)) {
      where.sentiment = sentiment
    }
    if (videoId) {
      where.videoId = videoId
    }
    if (search.trim()) {
      const q = search.trim()
      where.OR = [
        { text: { contains: q } },
        { author: { contains: q } },
      ]
    }

    const [comments, videos] = await Promise.all([
      db.comment.findMany({
        where,
        include: { video: { select: { id: true, title: true } } },
        orderBy: { publishedAt: 'desc' },
      }),
      db.video.findMany({
        where: { userId: user.id },
        select: { id: true, title: true },
        orderBy: { publishedAt: 'desc' },
      }),
    ])

    const serialized = comments.map((c) => ({
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
    }))

    return NextResponse.json({
      comments: serialized,
      videos: videos.map((v) => ({ id: v.id, title: v.title })),
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[comments GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}
