import { NextRequest, NextResponse } from 'next/server'
import type { DetectedField } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

const MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM = `You are a document analysis assistant. You are given an image of a single PDF page. Identify every location where a person is expected to place a handwritten signature, their initials, or a date — for example signature lines, "Sign here" marks, X____ lines, or blank fields labelled Signature / Initials / Date.

Return ONLY a JSON array (no prose, no code fences). Each item:
{"label":"signature"|"initial"|"date","x":<number>,"y":<number>,"width":<number>,"height":<number>,"confidence":<number>}

Coordinates are NORMALIZED to the image: x,y is the TOP-LEFT of the field as a fraction of image width/height (0..1); width,height are fractions too. Make the box cover the writable area (the line/blank), roughly the size a signature would occupy. confidence is 0..1. If there are no such fields, return [].`

type AnthropicContentBlock = { type: string; text?: string }
type AnthropicResponse = { content?: AnthropicContentBlock[]; error?: { message?: string } }

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
    // Keep boxes inside the page.
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
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI field detection is not configured on this deployment.', configured: false },
      { status: 503 }
    )
  }

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

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: parsed.mediaType, data: parsed.data },
              },
              { type: 'text', text: 'Find the signature, initial, and date fields on this page.' },
            ],
          },
        ],
      }),
    })

    const data = (await res.json()) as AnthropicResponse
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? 'AI request failed' },
        { status: 502 }
      )
    }

    const text = (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n')

    const fields = coerceFields(extractJsonArray(text))
    return NextResponse.json({ fields, configured: true })
  } catch (err) {
    console.error('detect-fields error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Detection failed' },
      { status: 500 }
    )
  }
}
