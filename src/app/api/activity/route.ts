import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

// Returns daily activity counts for the last `days` days (default 119 = ~17 weeks)
// Buckets across tasks, notes, scripts, videos, files, and events by createdAt/publishedAt
export async function GET(req: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '119', 10) || 119, 28), 365)

    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - (days - 1))
    start.setHours(0, 0, 0, 0)

    const [tasks, notes, scripts, videos, files, events] = await Promise.all([
      db.workflowTask.findMany({
        where: { userId: user.id, createdAt: { gte: start } },
        select: { createdAt: true, completed: true },
      }),
      db.note.findMany({
        where: { userId: user.id, createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      db.script.findMany({
        where: { userId: user.id, createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      db.video.findMany({
        where: { userId: user.id, publishedAt: { gte: start } },
        select: { publishedAt: true },
      }),
      db.fileAsset.findMany({
        where: { userId: user.id, createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      db.contentEvent.findMany({
        where: { userId: user.id, createdAt: { gte: start } },
        select: { createdAt: true },
      }),
    ])

    // Build a map of YYYY-MM-DD -> breakdown
    const dayMap = new Map<
      string,
      { count: number; tasks: number; notes: number; scripts: number; videos: number; files: number; events: number }
    >()

    function ensureDay(d: Date) {
      const key = d.toISOString().slice(0, 10)
      if (!dayMap.has(key)) {
        dayMap.set(key, { count: 0, tasks: 0, notes: 0, scripts: 0, videos: 0, files: 0, events: 0 })
      }
      return key
    }

    for (const t of tasks) {
      const k = ensureDay(t.createdAt)
      const day = dayMap.get(k)!
      day.tasks += 1
      day.count += 1
    }
    for (const n of notes) {
      const k = ensureDay(n.createdAt)
      const day = dayMap.get(k)!
      day.notes += 1
      day.count += 1
    }
    for (const s of scripts) {
      const k = ensureDay(s.createdAt)
      const day = dayMap.get(k)!
      day.scripts += 1
      day.count += 1
    }
    for (const v of videos) {
      const k = ensureDay(v.publishedAt)
      const day = dayMap.get(k)!
      day.videos += 1
      day.count += 1
    }
    for (const f of files) {
      const k = ensureDay(f.createdAt)
      const day = dayMap.get(k)!
      day.files += 1
      day.count += 1
    }
    for (const e of events) {
      const k = ensureDay(e.createdAt)
      const day = dayMap.get(k)!
      day.events += 1
      day.count += 1
    }

    // Build the full array (including zero days)
    const daysArr: Array<{
      date: string
      count: number
      tasks: number
      notes: number
      scripts: number
      videos: number
      files: number
      events: number
    }> = []
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      const day = dayMap.get(key)
      daysArr.push({
        date: key,
        count: day?.count ?? 0,
        tasks: day?.tasks ?? 0,
        notes: day?.notes ?? 0,
        scripts: day?.scripts ?? 0,
        videos: day?.videos ?? 0,
        files: day?.files ?? 0,
        events: day?.events ?? 0,
      })
    }

    const total = daysArr.reduce((s, d) => s + d.count, 0)
    const activeDays = daysArr.filter((d) => d.count > 0).length

    return NextResponse.json({
      days: daysArr,
      total,
      activeDays,
      range: days,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[activity GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
