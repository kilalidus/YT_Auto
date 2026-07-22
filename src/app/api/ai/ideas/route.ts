import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { generateContentIdeas } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    await requireUser()
    const body = await req.json().catch(() => ({}))

    const niche = (body.niche ?? '').toString().trim()
    const audience = (body.audience ?? '').toString().trim()
    const channelName = (body.channelName ?? '').toString().trim()
    const countRaw = Number(body.count ?? 8)
    const count = Number.isFinite(countRaw) ? countRaw : 8

    if (!niche) {
      return NextResponse.json(
        { error: 'niche is required' },
        { status: 400 }
      )
    }
    if (!audience) {
      return NextResponse.json(
        { error: 'audience is required' },
        { status: 400 }
      )
    }

    const result = await generateContentIdeas({
      niche,
      audience,
      channelName,
      count,
    })

    // Ideas are ephemeral — not persisted. The user sends chosen ones to the
    // workflow as tasks via POST /api/tasks.
    const ideas = Array.isArray(result?.ideas) ? result.ideas : []

    return NextResponse.json({ ideas })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[ai/ideas] error', err)
    return NextResponse.json(
      { error: 'Failed to generate content ideas' },
      { status: 500 }
    )
  }
}
