import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

function parseJSON(value: string | null | undefined, fallback: unknown = {}) {
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
    const scripts = await db.script.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    const parsed = scripts.map((s) => ({
      ...s,
      metadata: parseJSON(s.metadata, {}),
    }))

    return NextResponse.json({ scripts: parsed })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[scripts GET] error', err)
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const title = (body.title ?? '').toString().trim()
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const script = await db.script.create({
      data: {
        userId: user.id,
        title,
        type: body.type ?? 'full',
        content: body.content ?? '',
        metadata: JSON.stringify(body.metadata ?? {}),
        projectId: body.projectId ?? null,
      },
    })

    return NextResponse.json(
      { script: { ...script, metadata: parseJSON(script.metadata, {}) } },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[scripts POST] error', err)
    return NextResponse.json({ error: 'Failed to create script' }, { status: 500 })
  }
}
