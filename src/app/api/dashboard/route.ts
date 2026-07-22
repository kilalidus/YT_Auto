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

export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser()

    const [channels, recentVideos, tasks, upcomingEvents, pinnedNotes, notifications, projects] =
      await Promise.all([
        db.channel.findMany({
          where: { userId: user.id },
          include: { _count: { select: { videos: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        db.video.findMany({
          where: { userId: user.id },
          include: { channel: { select: { title: true } } },
          orderBy: { publishedAt: 'desc' },
          take: 5,
        }),
        db.workflowTask.findMany({
          where: { userId: user.id },
          include: { project: { select: { id: true, name: true, color: true } } },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        }),
        db.contentEvent.findMany({
          where: {
            userId: user.id,
            date: {
              gte: new Date(),
              lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          },
          include: { project: { select: { id: true, name: true, color: true } } },
          orderBy: { date: 'asc' },
        }),
        db.note.findMany({
          where: { userId: user.id, pinned: true, archived: false },
          orderBy: { updatedAt: 'desc' },
        }),
        db.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
        }),
        db.project.findMany({
          where: { userId: user.id, status: 'active' },
          include: { _count: { select: { tasks: true, notes: true, files: true } } },
          orderBy: { updatedAt: 'desc' },
        }),
      ])

    // Fetch real 90-day analytics for the growth chart + watch time stat.
    // Aggregated across all the user's channels.
    const channelIds = channels.map((c) => c.id)
    const ninetyDaysAgo = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000)
    ninetyDaysAgo.setUTCHours(0, 0, 0, 0)

    const analyticsSnapshots =
      channelIds.length > 0
        ? await db.analyticsSnapshot.findMany({
            where: { channelId: { in: channelIds }, date: { gte: ninetyDaysAgo } },
            orderBy: { date: 'asc' },
          })
        : []

    // Aggregate snapshots by date.
    const byDate = new Map<string, { date: string; subs: number; views: number; watchMinutes: number; revenue: number }>()
    for (const s of analyticsSnapshots) {
      const key = s.date.toISOString().slice(0, 10)
      const entry = byDate.get(key) ?? { date: key, subs: 0, views: 0, watchMinutes: 0, revenue: 0 }
      entry.subs += s.subscribersGained - s.subscribersLost
      entry.views += s.views
      entry.watchMinutes += s.estimatedWatchTimeMinutes
      entry.revenue += s.estimatedRevenueMicros / 1_000_000
      byDate.set(key, entry)
    }
    const growthData = Array.from(byDate.values()).map((e) => ({
      date: e.date,
      subscribers: e.subs,
      views: e.views,
      watchMinutes: e.watchMinutes,
      revenue: Math.round(e.revenue * 100) / 100,
    }))

    const analyticsTotals = growthData.reduce(
      (acc, d) => ({
        views: acc.views + d.views,
        watchMinutes: acc.watchMinutes + d.watchMinutes,
        revenue: Math.round((acc.revenue + d.revenue) * 100) / 100,
        subsGained: acc.subsGained + d.subscribers,
      }),
      { views: 0, watchMinutes: 0, revenue: 0, subsGained: 0 }
    )

    const unreadNotifications = notifications.filter((n) => !n.read).length
    const latestNotifications = notifications.slice(0, 5)

    const tasksByStatus = tasks.reduce(
      (acc, t) => {
        const key = t.status || 'idea'
        if (!acc[key]) acc[key] = []
        acc[key].push({
          ...t,
          labels: parseJSON(t.labels, []),
        })
        return acc
      },
      {} as Record<string, unknown[]>
    )

    const totalSubscribers = channels.reduce((sum, c) => sum + c.subscriberCount, 0)
    const totalViews = channels.reduce((sum, c) => sum + c.viewCount, 0)
    const totalVideos = channels.reduce((sum, c) => sum + c.videoCount, 0)
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.completed).length

    const recentVideosParsed = recentVideos.map((v) => ({
      ...v,
      tags: parseJSON(v.tags, []),
    }))

    const pinnedNotesParsed = pinnedNotes.map((n) => ({
      ...n,
      tags: parseJSON(n.tags, []),
    }))

    return NextResponse.json({
      channels,
      recentVideos: recentVideosParsed,
      tasks: tasks.map((t) => ({ ...t, labels: parseJSON(t.labels, []) })),
      tasksByStatus,
      upcomingEvents,
      pinnedNotes: pinnedNotesParsed,
      unreadNotifications,
      latestNotifications,
      notifications: latestNotifications,
      projects,
      stats: {
        totalSubscribers,
        totalViews,
        totalVideos,
        totalTasks,
        completedTasks,
        // Real analytics totals from the YouTube Analytics API (90-day window).
        totalWatchMinutes: analyticsTotals.watchMinutes,
        totalRevenue: analyticsTotals.revenue,
        subsGained90d: analyticsTotals.subsGained,
        views90d: analyticsTotals.views,
      },
      growthData,
      hasAnalyticsData: analyticsSnapshots.length > 0,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[dashboard] error', err)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
