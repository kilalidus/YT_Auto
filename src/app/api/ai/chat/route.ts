import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { chatAssistant } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))

    const rawMessages = Array.isArray(body.messages) ? body.messages : []
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
    for (const m of rawMessages) {
      if (!m || typeof m.content !== 'string') continue
      if (m.role === 'user' || m.role === 'assistant') {
        messages.push({ role: m.role, content: m.content })
      }
    }

    if (messages.length === 0) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 })
    }

    const context =
      typeof body.context === 'string' && body.context.trim()
        ? body.context
        : undefined

    // Touch user to ensure auth (avoid unused var lint)
    void user

    const reply = await chatAssistant(messages, context)

    return NextResponse.json({ reply })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[ai/chat] error', err)
    return NextResponse.json(
      { error: 'Failed to get chat response' },
      { status: 500 }
    )
  }
}
