import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { analyzeChannel } from '@/lib/ai'

function parseJSON(value: string | null | undefined, fallback: unknown = []) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const channelId = (body.channelId ?? '').toString()
    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 })
    }

    const channel = await db.channel.findFirst({
      where: { id: channelId, userId: user.id },
      include: {
        videos: {
          orderBy: { publishedAt: 'desc' },
          take: 8,
        },
      },
    })
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const recentVideos = channel.videos.map((v) => ({
      title: v.title,
      viewCount: v.viewCount,
      likeCount: v.likeCount,
      commentCount: v.commentCount,
      publishedAt: v.publishedAt.toISOString(),
      tags: parseJSON(v.tags, []) as string[],
      duration: v.duration,
      isShort: v.isShort,
    }))

    const analysis = await analyzeChannel({
      title: channel.title,
      description: channel.description,
      subscriberCount: channel.subscriberCount,
      videoCount: channel.videoCount,
      viewCount: channel.viewCount,
      recentVideos,
    })

    const healthScore =
      typeof analysis.healthScore === 'number' && !Number.isNaN(analysis.healthScore)
        ? Math.max(0, Math.min(100, Math.round(analysis.healthScore)))
        : 0

    const stored = await db.aIAnalysis.create({
      data: {
        userId: user.id,
        channelId: channel.id,
        type: 'channel',
        result: JSON.stringify(analysis),
        score: healthScore,
      },
    })

    await db.channel.update({
      where: { id: channel.id },
      data: { healthScore },
    })

    return NextResponse.json({
      analysis: {
        id: stored.id,
        channelId: channel.id,
        type: 'channel',
        score: healthScore,
        result: analysis,
        createdAt: stored.createdAt,
      },
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[ai/analyze] error', err)
    return NextResponse.json(
      { error: 'Failed to analyze channel' },
      { status: 500 }
    )
  }
}
