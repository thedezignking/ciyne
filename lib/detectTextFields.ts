import type { TextFieldDetection } from '@/types'
import { renderPdfPage } from '@/lib/renderPdfPage'

const MAX_EDGE = 1600

export type DetectTextResult =
  | { ok: true; fields: TextFieldDetection[] }
  | { ok: false; configured: boolean; error: string }

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

export async function detectTextFields(file: File, pageIndex: number): Promise<DetectTextResult> {
  let image: string
  try {
    image = await pageToImage(file, pageIndex)
  } catch {
    return { ok: false, configured: true, error: 'Could not read this page.' }
  }

  let res: Response
  try {
    res = await fetch('/api/detect-text-fields', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image }),
    })
  } catch {
    return { ok: false, configured: true, error: 'Network error.' }
  }

  const data = (await res.json().catch(() => ({}))) as {
    fields?: TextFieldDetection[]
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
