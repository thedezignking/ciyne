import { NextRequest, NextResponse } from 'next/server'
import type { TextFieldDetection } from '@/types'
import { runVision } from '@/lib/visionProvider'

export const runtime = 'nodejs'
export const maxDuration = 30

const SYSTEM = `You are a document analysis assistant. You are given an image of a single PDF page.

Your job is to find ONLY unfilled placeholder text — dummy text that needs to be replaced with real information. These are things like:

INCLUDE (unfilled placeholders):
- Bracketed placeholders: "[Your Name]", "[Full Name]", "[Date]", "[Title]", "[Company]", "[Enter name here]"
- Blank lines meant for handwriting: "___________", "____________"
- Labeled blanks: "Name: ____________", "Date: ____________", "I, ____________, hereby..."
- Obvious dummy/template text in brackets or with underscores

DO NOT INCLUDE (already filled or real content):
- Names that are already typed/written (e.g. "John Smith", "Jane Doe")
- Dates that are already filled in (e.g. "January 1, 2025", "01/01/2025")
- Any real, meaningful text that is NOT a placeholder
- Section headings, paragraph text, legal language, instructions
- Signature fields (those are handled separately)

Return ONLY a JSON array (no prose, no code fences). Each item:
{"label":"<human-readable label>","placeholder":"<exact placeholder text found>","x":<number>,"y":<number>,"width":<number>,"height":<number>,"fontScale":<number>,"fontColor":"<hex>"}

- "label" is a short human-friendly name like "Full Name", "Date", "Title", "Company", "Email", "Address", "Phone"
- "placeholder" is the EXACT dummy text as it appears on the page (e.g. "[Your Name]" or "___________")
- Coordinates are NORMALIZED to the image: x,y is the TOP-LEFT as a fraction of image width/height (0..1); width,height are fractions too
- Make the box TIGHTLY cover ONLY the placeholder text — no extra padding
- "fontScale" is the estimated font size as a fraction of total page height (e.g. 0.015 for ~12pt on a letter page)
- "fontColor" is the hex color of surrounding body text (e.g. "#000000"), NOT the placeholder brackets
- If there are no unfilled placeholders, return []`

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

function coerceFields(raw: unknown): TextFieldDetection[] {
  if (!Array.isArray(raw)) return []
  const out: TextFieldDetection[] = []
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
    const label = String(o.label ?? 'Text').slice(0, 50)
    const placeholder = String(o.placeholder ?? '').slice(0, 200)
    const fontScale = Math.max(0.005, Math.min(0.1, Number(o.fontScale) || 0.015))
    const rawColor = String(o.fontColor ?? '#000000').trim()
    const fontColor = /^#[0-9a-fA-F]{6}$/.test(rawColor) ? rawColor : '#000000'
    out.push({ label, placeholder, x, y, width, height, fontScale, fontColor })
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
    userText: 'Find ONLY unfilled placeholder text on this page — things like [Your Name], [Date], blank lines (______), or bracketed dummy text. Do NOT include text that is already filled in with real names, dates, or content. Do NOT include signature fields.',
    image: parsed,
    maxTokens: 1024,
  })

  if (!result.ok) {
    console.error('Text field detection failed:', result)
    return NextResponse.json(
      { error: result.error, configured: result.configured },
      { status: result.status }
    )
  }

  const fields = coerceFields(extractJsonArray(result.text))
  return NextResponse.json({ fields, configured: true })
}
