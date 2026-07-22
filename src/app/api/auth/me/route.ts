import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
  const settings = await db.userSetting.findUnique({
    where: { userId: user.id },
  })
  return NextResponse.json({
    user,
    settings: settings
      ? {
          theme: settings.theme,
          language: settings.language,
          aiProvider: settings.aiProvider,
          emailNotifications: settings.emailNotifications,
          pushNotifications: settings.pushNotifications,
          uploadReminders: settings.uploadReminders,
          weeklyReports: settings.weeklyReports,
          monthlyReports: settings.monthlyReports,
          trendingAlerts: settings.trendingAlerts,
        }
      : null,
  })
}
