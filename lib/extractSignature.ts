import { fitScale, loadImageSrc, MAX_IMAGE_EDGE } from '@/lib/imageUtils'

const MAX_EDGE = 1600 // cap upload size for the vision call

export type ExtractResult =
  | { ok: true; file: File } // cropped to the detected signature
  | { ok: false; configured: boolean; error: string }

type Box = { x: number; y: number; width: number; height: number }

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Downscale a photo to a compact JPEG data URL for the vision request. */
async function toCompactJpeg(img: HTMLImageElement): Promise<string> {
  const longest = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

/** Crops the full-resolution image to the normalized box, with a little padding. */
async function cropToBox(img: HTMLImageElement, box: Box, name: string): Promise<File> {
  const W = img.naturalWidth
  const H = img.naturalHeight
  const pad = 0.04
  const x0 = Math.max(0, (box.x - pad) * W)
  const y0 = Math.max(0, (box.y - pad) * H)
  const x1 = Math.min(W, (box.x + box.width + pad) * W)
  const y1 = Math.min(H, (box.y + box.height + pad) * H)
  const cw = Math.max(1, Math.round(x1 - x0))
  const ch = Math.max(1, Math.round(y1 - y0))

  // Cap the crop so the downstream cleaner canvas stays under platform limits.
  const scale = fitScale(cw, ch, MAX_IMAGE_EDGE)
  const dw = Math.max(1, Math.round(cw * scale))
  const dh = Math.max(1, Math.round(ch * scale))

  const canvas = document.createElement('canvas')
  canvas.width = dw
  canvas.height = dh
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, x0, y0, cw, ch, 0, 0, dw, dh)

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? new Blob()), 'image/png')
  )
  const base = name.replace(/\.[^.]+$/, '') || 'signature'
  return new File([blob], `${base}-cropped.png`, { type: 'image/png' })
}

/**
 * Uses AI to locate the handwritten signature in a (possibly messy) photo and
 * returns a new File cropped tightly to it. Background removal still happens
 * afterwards in the normal cleaner. Falls back gracefully when unconfigured.
 */
export async function extractSignature(file: File): Promise<ExtractResult> {
  let img: HTMLImageElement
  let dataUrl: string
  try {
    dataUrl = await fileToDataUrl(file)
    img = await loadImageSrc(dataUrl)
  } catch {
    return { ok: false, configured: true, error: 'Could not read this image.' }
  }

  let compact: string
  try {
    compact = await toCompactJpeg(img)
  } catch {
    return { ok: false, configured: true, error: 'Could not process this image.' }
  }

  let res: Response
  try {
    res = await fetch('/api/extract-signature', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: compact }),
    })
  } catch {
    return { ok: false, configured: true, error: 'Network error.' }
  }

  const data = (await res.json().catch(() => ({}))) as {
    found?: boolean
    box?: Box
    error?: string
    configured?: boolean
  }

  if (!res.ok) {
    return { ok: false, configured: data.configured !== false, error: data.error ?? 'Extraction failed.' }
  }

  if (!data.found || !data.box) {
    return { ok: false, configured: true, error: 'No signature found in the photo.' }
  }

  try {
    const cropped = await cropToBox(img, data.box, file.name)
    return { ok: true, file: cropped }
  } catch {
    return { ok: false, configured: true, error: 'Could not crop the signature.' }
  }
}
