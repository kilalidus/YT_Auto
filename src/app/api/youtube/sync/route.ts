import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { syncYouTubeData } from '@/lib/youtube-sync'
import { getValidYouTubeAccessToken } from '@/lib/youtube-oauth'
import { db } from '@/lib/db'

// POST /api/youtube/sync
// Manually triggers a full re-sync of the authenticated user's YouTube data:
// channels, videos, playlists, comments. Returns a summary of what was synced.
export async function POST() {
  try {
    const user = await requireUser()

    // Verify YouTube is connected (tokens exist).
    const token = await getValidYouTubeAccessToken(user.id)
    if (!token) {
      return NextResponse.json(
        { error: 'YouTube is not connected. Connect your channel first.' },
        { status: 400 }
      )
    }

    const result = await syncYouTubeData(user.id)

    // Create a notification on successful sync.
    if (result.errors.length === 0 || result.channels > 0) {
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'system',
          title: 'YouTube sync complete',
          message: `Synced ${result.channels} channel(s), ${result.videos} video(s), ${result.playlists} playlist(s), ${result.comments} comment(s), ${result.analyticsDays} analytics day(s).`,
          read: false,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      ...result,
      syncedAt: result.syncedAt.toISOString(),
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[youtube/sync] error', err)
    return NextResponse.json(
      { error: 'Failed to sync YouTube data' },
      { status: 500 }
    )
  }
}
