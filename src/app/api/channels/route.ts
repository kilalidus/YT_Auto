import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

// GET /api/channels
// Returns all YouTube channels for the authenticated user. Channels are
// created exclusively by the YouTube OAuth sync flow — there is no manual
// creation endpoint. This guarantees every channel in the DB corresponds to
// a real YouTube channel the user owns.
export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser()
    const channels = await db.channel.findMany({
      where: { userId: user.id },
      include: { _count: { select: { videos: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ channels })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[channels GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }
}

// NOTE: There is intentionally no POST handler here. Channels can only be
// created via the YouTube OAuth sync flow (/api/youtube/connect → callback →
// syncYouTubeData). This prevents users from manually entering fake channel
// data and ensures every channel corresponds to a real YouTube channel they
// own. To "add" a channel, the user connects their YouTube account in
// Settings → Connected Accounts.

