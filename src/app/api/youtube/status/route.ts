import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/youtube/status
// Returns the YouTube connection status for the authenticated user:
//   - connected: boolean
//   - channels: list of connected channels with their sync metadata
//   - lastSyncedAt: most recent sync timestamp across all channels
export async function GET() {
  try {
    const user = await requireUser()

    const [token, channels] = await Promise.all([
      db.youtubeToken.findFirst({
        where: { userId: user.id },
        select: { id: true, expiresAt: true, scope: true, updatedAt: true },
      }),
      db.channel.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          title: true,
          youtubeChannelId: true,
          connected: true,
          lastSyncedAt: true,
          thumbnail: true,
          subscriberCount: true,
          videoCount: true,
          viewCount: true,
        },
      }),
    ])

    const connectedChannels = channels.filter((c) => c.connected)
    const lastSyncedAt = connectedChannels
      .map((c) => c.lastSyncedAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0]

    return NextResponse.json({
      connected: Boolean(token),
      tokenExpiresAt: token?.expiresAt?.toISOString() ?? null,
      channels: connectedChannels,
      lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[youtube/status] error', err)
    return NextResponse.json(
      { error: 'Failed to get YouTube status' },
      { status: 500 }
    )
  }
}
