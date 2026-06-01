import { NextRequest, NextResponse } from 'next/server'
import type { DetectedField } from '@/types'
import { runVision } from '@/lib/visionProvider'

export const runtime = 'nodejs'
export const maxDuration = 30

const SYSTEM = `You are a document analysis assistant. You are given an image of a single PDF page. Identify every location where a person is expected to place a handwritten signature, their initials, or a date — for example signature lines, "Sign here" marks, X____ lines, or blank fields labelled Signature / Initials / Date.

Return ONLY a JSON array (no prose, no code fences). Each item:
{"label":"signature"|"initial"|"date","x":<number>,"y":<number>,"width":<number>,"height":<number>,"confidence":<number>}

Coordinates are NORMALIZED to the image: x,y is the TOP-LEFT of the field as a fraction of image width/height (0..1); width,height are fractions too. Make the box cover the writable area (the line/blank), roughly the size a signature would occupy. confidence is 0..1. If there are no such fields, return [].`

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

function coerceFields(raw: unknown): DetectedField[] {
  if (!Array.isArray(raw)) return []
  const out: DetectedField[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const x = clamp01(Number(o.x))
    const y = clamp01(Number(o.y))
    let width = clamp01(Number(o.width))
    let height = clamp01(Number(o.height))
    if (width <= 0 || height <= 0) continue
    width = Math.min(width, 1 - x)
    height = Math.min(height, 1 - y)
    const labelRaw = String(o.label ?? 'signature').toLowerCase()
    const label = ['signature', 'initial', 'date'].includes(labelRaw) ? labelRaw : 'signature'
    out.push({ label, x, y, width, height, confidence: clamp01(Number(o.confidence ?? 0.5)) })
  }
  return out
}

function extractJsonArray(text: string): unknown {
  const fenced = text.replace(/```json\s*|\s*```/gi, '')
  const start = fenced.indexOf('[')
  const end = fenced.lastIndexOf(']')
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
    return NextResponse.json({ error: 'Page image is required' }, { status: 400 })
  }

  const parsed = parseDataUrl(image)
  if (!parsed) {
    return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 })
  }

  const result = await runVision({
    system: SYSTEM,
    userText: 'Find the signature, initial, and date fields on this page.',
    image: parsed,
    maxTokens: 1024,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, configured: result.configured },
      { status: result.status }
    )
  }

  const fields = coerceFields(extractJsonArray(result.text))
  return NextResponse.json({ fields, configured: true })
}
