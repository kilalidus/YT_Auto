import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { deleteYouTubeTokens } from '@/lib/youtube-oauth'
import { db } from '@/lib/db'

// POST /api/youtube/disconnect
// Revokes the YouTube connection for the authenticated user:
//   1. Delete the stored OAuth tokens.
//   2. Mark all connected channels as disconnected (we keep the channel + video
//      data so the user doesn't lose their workflows/notes; they can re-connect
//      later to refresh the data).
//   3. Create a notification.
// Returns 200 on success.
export async function POST() {
  try {
    const user = await requireUser()

    await deleteYouTubeTokens(user.id)

    // Mark channels as disconnected (keep the data).
    await db.channel.updateMany({
      where: { userId: user.id },
      data: { connected: false },
    })

    await db.notification.create({
      data: {
        userId: user.id,
        type: 'system',
        title: 'YouTube disconnected',
        message:
          'Your YouTube account has been disconnected. Channel and video data are preserved but will no longer sync.',
        read: false,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[youtube/disconnect] error', err)
    return NextResponse.json(
      { error: 'Failed to disconnect YouTube' },
      { status: 500 }
    )
  }
}
