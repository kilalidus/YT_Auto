import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await db.fileAsset.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    await db.fileAsset.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[file DELETE] error', err)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
