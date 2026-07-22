import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser()

    let settings = await db.userSetting.findUnique({
      where: { userId: user.id },
    })

    if (!settings) {
      settings = await db.userSetting.create({
        data: { userId: user.id },
      })
    }

    return NextResponse.json({ settings })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[settings GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))

    let settings = await db.userSetting.findUnique({
      where: { userId: user.id },
    })

    if (!settings) {
      settings = await db.userSetting.create({
        data: { userId: user.id },
      })
    }

    const data: Record<string, unknown> = {}
    if (body.theme !== undefined) data.theme = body.theme
    if (body.language !== undefined) data.language = body.language
    if (body.aiProvider !== undefined) data.aiProvider = body.aiProvider
    if (body.geminiApiKey !== undefined) data.geminiApiKey = body.geminiApiKey
    if (body.emailNotifications !== undefined)
      data.emailNotifications = Boolean(body.emailNotifications)
    if (body.pushNotifications !== undefined)
      data.pushNotifications = Boolean(body.pushNotifications)
    if (body.uploadReminders !== undefined)
      data.uploadReminders = Boolean(body.uploadReminders)
    if (body.weeklyReports !== undefined)
      data.weeklyReports = Boolean(body.weeklyReports)
    if (body.monthlyReports !== undefined)
      data.monthlyReports = Boolean(body.monthlyReports)
    if (body.trendingAlerts !== undefined)
      data.trendingAlerts = Boolean(body.trendingAlerts)

    const updated = await db.userSetting.update({
      where: { userId: user.id },
      data,
    })

    return NextResponse.json({ settings: updated })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[settings PATCH] error', err)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
