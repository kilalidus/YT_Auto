import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { generateScript } from '@/lib/ai'

function parseJSON(value: string | null | undefined, fallback: unknown = {}) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const topic = (body.topic ?? '').toString().trim()
    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 })
    }

    const params = {
      type: (body.type ?? 'full').toString(),
      topic,
      audience: (body.audience ?? 'general audience').toString(),
      tone: (body.tone ?? 'engaging').toString(),
      duration: (body.duration ?? '5-10 minutes').toString(),
      channelName: (body.channelName ?? 'My Channel').toString(),
      extra: body.extra ? body.extra.toString() : undefined,
    }

    const script = await generateScript(params)

    const metadata = {
      type: params.type,
      topic: params.topic,
      audience: params.audience,
      tone: params.tone,
      duration: params.duration,
      channelName: params.channelName,
      extra: params.extra ?? null,
    }

    const saved = await db.script.create({
      data: {
        userId: user.id,
        title: topic,
        type: params.type,
        content: script,
        metadata: JSON.stringify(metadata),
        projectId: body.projectId ?? null,
      },
    })

    return NextResponse.json({
      script,
      saved: {
        ...saved,
        metadata: parseJSON(saved.metadata, {}),
      },
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[ai/script] error', err)
    return NextResponse.json(
      { error: 'Failed to generate script' },
      { status: 500 }
    )
  }
}
