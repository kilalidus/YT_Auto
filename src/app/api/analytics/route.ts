import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

// GET /api/analytics?channelId=<id>&range=7d|30d|90d
// Returns real analytics data sourced from the YouTube Analytics API (synced
// into the AnalyticsSnapshot table). If no channelId is given, aggregates
// across all of the user's channels.
//
// Response shape:
//   {
//     range: '7d' | '30d' | '90d',
//     totals: { views, watchMinutes, subscribersGained, likes, comments, shares, revenue, impressions, clicks },
//     daily: [{ date, views, watchMinutes, subsGained, likes, revenue }, ...],
//     topVideos: [{ id, title, viewCount, likeCount, commentCount, thumbnail }, ...],
//     channels: [{ id, title, subscriberCount, viewCount, videoCount }, ...]
//   }
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('channelId') || undefined
    const rangeParam = searchParams.get('range') || '30d'
    const days = rangeParam === '7d' ? 7 : rangeParam === '90d' ? 90 : 30

    // Resolve the channels to query. If channelId is specified, use just that
    // one (after verifying it belongs to the user). Otherwise use all.
    const channels = await db.channel.findMany({
      where: { userId: user.id, ...(channelId ? { id: channelId } : {}) },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        subscriberCount: true,
        viewCount: true,
        videoCount: true,
      },
    })

    if (channels.length === 0) {
      return NextResponse.json({
        range: rangeParam,
        totals: {
          views: 0,
          watchMinutes: 0,
          subscribersGained: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          revenue: 0,
          impressions: 0,
          clicks: 0,
        },
        daily: [],
        topVideos: [],
        channels: [],
        connected: false,
      })
    }

    const channelIds = channels.map((c) => c.id)
    const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
    startDate.setUTCHours(0, 0, 0, 0)

    // Fetch daily snapshots for the selected range.
    const snapshots = await db.analyticsSnapshot.findMany({
      where: {
        channelId: { in: channelIds },
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    })

    // Aggregate by date (in case multiple channels contribute to the same day).
    const byDate = new Map<string, {
      date: string
      views: number
      watchMinutes: number
      subsGained: number
      subsLost: number
      likes: number
      comments: number
      shares: number
      revenue: number
      impressions: number
      clicks: number
      avgViewDuration: number
      viewCountForAvg: number
    }>()

    for (const s of snapshots) {
      const key = s.date.toISOString().slice(0, 10)
      const entry = byDate.get(key) ?? {
        date: key,
        views: 0,
        watchMinutes: 0,
        subsGained: 0,
        subsLost: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        revenue: 0,
        impressions: 0,
        clicks: 0,
        avgViewDuration: 0,
        viewCountForAvg: 0,
      }
      entry.views += s.views
      entry.watchMinutes += s.estimatedWatchTimeMinutes
      entry.subsGained += s.subscribersGained
      entry.subsLost += s.subscribersLost
      entry.likes += s.likes
      entry.comments += s.comments
      entry.shares += s.shares
      entry.revenue += s.estimatedRevenueMicros / 1_000_000
      entry.impressions += s.impressions
      entry.clicks += s.impressionClicks
      // Weighted average of view duration.
      entry.avgViewDuration =
        (entry.avgViewDuration * entry.viewCountForAvg +
          s.averageViewDurationSeconds * s.views) /
        (entry.viewCountForAvg + s.views || 1)
      entry.viewCountForAvg += s.views
      byDate.set(key, entry)
    }

    const daily = Array.from(byDate.values()).map((e) => ({
      date: e.date,
      views: e.views,
      watchMinutes: e.watchMinutes,
      subsGained: e.subsGained - e.subsLost,
      likes: e.likes,
      comments: e.comments,
      shares: e.shares,
      revenue: Math.round(e.revenue * 100) / 100,
      impressions: e.impressions,
      clicks: e.clicks,
      avgViewDuration: Math.round(e.avgViewDuration),
    }))

    // Compute totals across the range.
    const totals = daily.reduce(
      (acc, d) => ({
        views: acc.views + d.views,
        watchMinutes: acc.watchMinutes + d.watchMinutes,
        subscribersGained: acc.subscribersGained + d.subsGained,
        likes: acc.likes + d.likes,
        comments: acc.comments + d.comments,
        shares: acc.shares + d.shares,
        revenue: Math.round((acc.revenue + d.revenue) * 100) / 100,
        impressions: acc.impressions + d.impressions,
        clicks: acc.clicks + d.clicks,
      }),
      {
        views: 0,
        watchMinutes: 0,
        subscribersGained: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        revenue: 0,
        impressions: 0,
        clicks: 0,
      }
    )

    // Top videos by view count (from the videos table, which is synced from
    // the YouTube Data API).
    const topVideos = await db.video.findMany({
      where: { userId: user.id, ...(channelId ? { channelId } : {}) },
      orderBy: { viewCount: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        thumbnail: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        duration: true,
        isShort: true,
        publishedAt: true,
      },
    })

    return NextResponse.json({
      range: rangeParam,
      totals,
      daily,
      topVideos,
      channels: channels.map((c) => ({
        id: c.id,
        title: c.title,
        thumbnail: c.thumbnail,
        subscriberCount: c.subscriberCount,
        viewCount: c.viewCount,
        videoCount: c.videoCount,
      })),
      hasAnalyticsData: snapshots.length > 0,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[analytics] error', err)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
