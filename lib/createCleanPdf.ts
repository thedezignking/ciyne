'use client'

import { renderPdfPage } from './renderPdfPage'
import type { FilledTextField } from '@/types'

// Keep rendered pages within iOS Safari's canvas memory cap (~16.7M px).
// A letter page at scale 2 is ~1224x1584 = 1.9M px, well under the limit.
const RENDER_SCALE = 2

/**
 * Creates a brand new PDF where placeholder text is visually replaced.
 *
 * For each page that has filled fields, the page is rendered to a canvas,
 * the placeholder region is painted over with the sampled background color,
 * and the replacement text is drawn in its place. The page is then embedded
 * as an image in a freshly created PDF. Pages without fields are copied
 * verbatim so they keep full vector fidelity.
 *
 * This is purely visual — it does NOT depend on finding the placeholder
 * text in the PDF's content stream, so it works on any PDF regardless of
 * font subsetting or encoding (which is why content-stream search fails on
 * real-world documents).
 */
export async function createCleanPdf(
  originalFile: File,
  fields: FilledTextField[]
): Promise<File> {
  const nonEmpty = fields.filter((f) => f.value.trim())
  if (nonEmpty.length === 0) return originalFile

  const byPage = new Map<number, FilledTextField[]>()
  for (const f of nonEmpty) {
    const arr = byPage.get(f.pageIndex) ?? []
    arr.push(f)
    byPage.set(f.pageIndex, arr)
  }

  const { PDFDocument } = await import('pdf-lib')

  const srcBytes = await originalFile.arrayBuffer()
  const srcDoc = await PDFDocument.load(srcBytes)
  const srcPages = srcDoc.getPages()
  const newDoc = await PDFDocument.create()

  for (let i = 0; i < srcPages.length; i++) {
    const pageFields = byPage.get(i)
    const { width: pdfW, height: pdfH } = srcPages[i].getSize()

    if (!pageFields) {
      const [copied] = await newDoc.copyPages(srcDoc, [i])
      newDoc.addPage(copied)
      continue
    }

    const { canvas } = await renderPdfPage(originalFile, i, RENDER_SCALE)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      // Couldn't get a context — fall back to copying the page unchanged.
      const [copied] = await newDoc.copyPages(srcDoc, [i])
      newDoc.addPage(copied)
      continue
    }

    for (const field of pageFields) {
      paintOverAndDraw(ctx, canvas, field)
    }

    // JPEG keeps file size reasonable; quality 0.92 is visually lossless for text.
    const jpegBytes = await canvasToJpegBytes(canvas, 0.92)
    const img = await newDoc.embedJpg(jpegBytes)
    const page = newDoc.addPage([pdfW, pdfH])
    page.drawImage(img, { x: 0, y: 0, width: pdfW, height: pdfH })
  }

  const newPdfBytes = await newDoc.save()
  return new File([newPdfBytes.buffer as ArrayBuffer], originalFile.name, {
    type: 'application/pdf',
  })
}

/**
 * Paints over the placeholder region with the page's background color, then
 * draws the replacement text vertically centered in the box.
 */
function paintOverAndDraw(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  field: FilledTextField
) {
  const x = field.x * canvas.width
  const y = field.y * canvas.height
  const w = field.width * canvas.width
  const h = field.height * canvas.height

  // Sample the background color from just outside the box (left and right
  // gutters), falling back to white. This makes the cover-up blend in on
  // colored or shaded documents.
  const bg = sampleBackground(ctx, x, y, w, h, canvas.width, canvas.height)

  // Pad the cover slightly so anti-aliased placeholder pixels are fully hidden.
  const pad = Math.max(2, h * 0.12)
  ctx.fillStyle = bg
  ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2)

  // Draw the replacement text. fontScale is a fraction of page height.
  const fontSize = Math.max(9, field.fontScale * canvas.height)
  ctx.fillStyle = field.fontColor && /^#[0-9a-fA-F]{6}$/.test(field.fontColor)
    ? field.fontColor
    : '#000000'
  ctx.textBaseline = 'middle'
  ctx.font = `${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`
  ctx.fillText(field.value, x, y + h / 2, w)
}

/**
 * Estimates the background color around a region by averaging a handful of
 * sample points just outside the box. Returns an rgb() string, white on error.
 */
function sampleBackground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number
): string {
  try {
    const midY = Math.min(canvasH - 1, Math.max(0, Math.round(y + h / 2)))
    const points: [number, number][] = [
      [Math.max(0, Math.round(x - 4)), midY], // just left of box
      [Math.min(canvasW - 1, Math.round(x + w + 4)), midY], // just right
      [Math.min(canvasW - 1, Math.round(x + w / 2)), Math.max(0, Math.round(y - 4))], // above
    ]
    let r = 0, g = 0, b = 0, n = 0
    for (const [px, py] of points) {
      const d = ctx.getImageData(px, py, 1, 1).data
      // Skip very dark samples (likely text, not background)
      if (d[0] + d[1] + d[2] < 200) continue
      r += d[0]; g += d[1]; b += d[2]; n++
    }
    if (n === 0) return '#ffffff'
    return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`
  } catch {
    return '#ffffff'
  }
}

/**
 * Converts a canvas to JPEG bytes. Uses toBlob (lower peak memory on iOS)
 * with a toDataURL fallback.
 */
async function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => {
    if (canvas.toBlob) {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    } else {
      resolve(null)
    }
  })

  if (blob) {
    return new Uint8Array(await blob.arrayBuffer())
  }

  // Fallback: toDataURL
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const base64 = dataUrl.split(',')[1]!
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)
  return bytes
}
