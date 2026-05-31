import type { DetectedField } from '@/types'
import { renderPdfPage } from '@/lib/renderPdfPage'

const MAX_EDGE = 1600 // cap the longest side to keep the upload small

export type DetectResult =
  | { ok: true; fields: DetectedField[] }
  | { ok: false; configured: boolean; error: string }

/** Renders a PDF page to a compact JPEG data URL for vision analysis. */
async function pageToImage(file: File, pageIndex: number): Promise<string> {
  const { canvas } = await renderPdfPage(file, pageIndex)
  const longest = Math.max(canvas.width, canvas.height)
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1

  if (scale === 1) return canvas.toDataURL('image/jpeg', 0.85)

  const out = document.createElement('canvas')
  out.width = Math.round(canvas.width * scale)
  out.height = Math.round(canvas.height * scale)
  const ctx = out.getContext('2d')
  if (!ctx) return canvas.toDataURL('image/jpeg', 0.85)
  ctx.drawImage(canvas, 0, 0, out.width, out.height)
  return out.toDataURL('image/jpeg', 0.85)
}

export async function detectFields(file: File, pageIndex: number): Promise<DetectResult> {
  let image: string
  try {
    image = await pageToImage(file, pageIndex)
  } catch {
    return { ok: false, configured: true, error: 'Could not read this page.' }
  }

  let res: Response
  try {
    res = await fetch('/api/detect-fields', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image }),
    })
  } catch {
    return { ok: false, configured: true, error: 'Network error.' }
  }

  const data = (await res.json().catch(() => ({}))) as {
    fields?: DetectedField[]
    error?: string
    configured?: boolean
  }

  if (!res.ok) {
    return {
      ok: false,
      configured: data.configured !== false,
      error: data.error ?? 'Detection failed.',
    }
  }

  return { ok: true, fields: data.fields ?? [] }
}
