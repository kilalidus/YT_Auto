import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

type ThumbnailStyle =
  | 'bold-text'
  | 'face-reaction'
  | 'minimal'
  | 'comparison'
  | 'clickbait'

const STYLE_DESCRIPTIONS: Record<ThumbnailStyle, string> = {
  'bold-text':
    'oversized bold uppercase typography dominating the frame, 2-3 high-contrast words stacked diagonally, vibrant gradient background (magenta to violet), dramatic drop shadows behind text, single focal subject on the right third',
  'face-reaction':
    'exaggerated surprised facial expression close-up on the left half, bright rim lighting, mouth open wide, eyes wide, complementary object or product on the right half, saturated warm color grade, slight motion blur for energy',
  minimal:
    'clean minimal composition with lots of negative space, single hero object centered on a solid pastel background, subtle soft shadow, tiny accent color dot, refined and premium look, no clutter, magazine-style elegance',
  comparison:
    'split-screen side-by-side comparison layout with a clear dividing line, left side labeled "BEFORE" showing a dull state, right side labeled "AFTER" showing a vibrant transformed state, high visual contrast between the two halves, satisfying reveal energy',
  clickbait:
    'maximum visual chaos designed to stop the scroll, glowing arrows pointing at the subject, red circles highlighting a key detail, oversized yellow number badge, exclamation energy, hyper-saturated colors, dramatic zoom on the focal point',
}

function isStyle(v: unknown): v is ThumbnailStyle {
  return (
    v === 'bold-text' ||
    v === 'face-reaction' ||
    v === 'minimal' ||
    v === 'comparison' ||
    v === 'clickbait'
  )
}

export async function POST(req: NextRequest) {
  try {
    await requireUser()
    const body = await req.json().catch(() => ({}))

    const title = (body.title ?? '').toString().trim()
    const rawStyle = (body.style ?? '').toString()
    const style: ThumbnailStyle = isStyle(rawStyle) ? rawStyle : 'bold-text'
    const description = (body.description ?? '').toString().trim()

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    const styleDescription = STYLE_DESCRIPTIONS[style]
    const prompt =
      `YouTube thumbnail concept, ${styleDescription}, ` +
      `for a video titled "${title}".` +
      (description ? ` ${description}.` : '') +
      ` High contrast, eye-catching, professional, 16:9 aspect ratio, bold colors, no actual text rendering needed.`

    const zai = await ZAI.create()
    const response = await zai.images.generations.create({
      prompt,
      size: '1344x768',
    })

    const base64 = response?.data?.[0]?.base64 ?? ''
    if (!base64) {
      return NextResponse.json(
        { error: 'Image generation returned no data' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      image: `data:image/png;base64,${base64}`,
      prompt,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[ai/thumbnail] error', err)
    return NextResponse.json(
      { error: 'Failed to generate thumbnail' },
      { status: 500 }
    )
  }
}
