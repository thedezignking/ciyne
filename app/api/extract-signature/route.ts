import { NextRequest, NextResponse } from 'next/server'
import { runVision } from '@/lib/visionProvider'

export const runtime = 'nodejs'
export const maxDuration = 30

const SYSTEM = `You are an image analysis assistant. You are given a photo that contains a handwritten signature somewhere in it — possibly on paper, with clutter, shadows, a desk, or other objects around it.

Find the single tightest bounding box around the handwritten signature ink itself (not the whole paper, not surrounding text or printed labels).

Return ONLY a JSON object (no prose, no code fences):
{"found":true,"x":<number>,"y":<number>,"width":<number>,"height":<number>}
Coordinates are NORMALIZED: x,y is the TOP-LEFT corner as a fraction of image width/height (0..1); width,height are fractions too. Pad the box very slightly so no ink is clipped.
If there is no handwritten signature in the image, return {"found":false}.`

function parseDataUrl(image: string): { mediaType: string; data: string } | null {
  const m = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i.exec(image)
  if (!m) return null
  const mediaType = m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1].toLowerCase()
  return { mediaType, data: m[2] }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function extractJsonObject(text: string): unknown {
  const fenced = text.replace(/```json\s*|\s*```/gi, '')
  const start = fenced.indexOf('{')
  const end = fenced.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  try {
    return JSON.parse(fenced.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  let image: string | undefined
  try {
    const body = (await request.json()) as { image?: string }
    image = body.image
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!image) {
    return NextResponse.json({ error: 'Image is required' }, { status: 400 })
  }

  const parsed = parseDataUrl(image)
  if (!parsed) {
    return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 })
  }

  const result = await runVision({
    system: SYSTEM,
    userText: 'Locate the handwritten signature in this photo.',
    image: parsed,
    maxTokens: 512,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, configured: result.configured },
      { status: result.status }
    )
  }

  const obj = extractJsonObject(result.text) as Record<string, unknown> | null
  if (!obj || obj.found !== true) {
    return NextResponse.json({ found: false, configured: true })
  }

  const x = clamp01(Number(obj.x))
  const y = clamp01(Number(obj.y))
  let width = clamp01(Number(obj.width))
  let height = clamp01(Number(obj.height))
  if (width <= 0 || height <= 0) {
    return NextResponse.json({ found: false, configured: true })
  }
  width = Math.min(width, 1 - x)
  height = Math.min(height, 1 - y)

  return NextResponse.json({ found: true, box: { x, y, width, height }, configured: true })
}
