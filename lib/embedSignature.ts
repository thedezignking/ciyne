import { PDFDocument } from 'pdf-lib'
import type { SignaturePlacement } from '@/types'

export type EmbedSignatureInput = SignaturePlacement & {
  pdfBytes: ArrayBuffer
  signaturePngBytes: Uint8Array
}

/** A single placement in canvas-space coordinates. */
export type Placement = SignaturePlacement

export async function embedSignature(
  input: EmbedSignatureInput
): Promise<Uint8Array> {
  const {
    pdfBytes,
    signaturePngBytes,
    pageIndex,
    x,
    y,
    width,
    height,
    canvasWidth,
    canvasHeight,
  } = input

  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages = pdfDoc.getPages()

  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error('Invalid page index')
  }

  const page = pages[pageIndex]
  const { width: pdfWidth, height: pdfHeight } = page.getSize()

  const scaleX = pdfWidth / canvasWidth
  const scaleY = pdfHeight / canvasHeight

  const pdfX = x * scaleX
  const pdfW = width * scaleX
  const pdfH = height * scaleY
  const pdfY = pdfHeight - (y + height) * scaleY

  const pngImage = await pdfDoc.embedPng(signaturePngBytes)
  page.drawImage(pngImage, {
    x: pdfX,
    y: pdfY,
    width: pdfW,
    height: pdfH,
  })

  return pdfDoc.save()
}

/**
 * Embeds the same signature PNG at multiple placements in one pass — loads
 * and saves the document only once. Coordinates are in canvas space.
 */
export async function embedSignatures(
  pdfBytes: ArrayBuffer,
  signaturePngBytes: Uint8Array,
  placements: Placement[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages = pdfDoc.getPages()
  const pngImage = await pdfDoc.embedPng(signaturePngBytes)

  for (const p of placements) {
    if (p.pageIndex < 0 || p.pageIndex >= pages.length) continue
    const page = pages[p.pageIndex]
    const { width: pdfWidth, height: pdfHeight } = page.getSize()
    const scaleX = pdfWidth / p.canvasWidth
    const scaleY = pdfHeight / p.canvasHeight
    page.drawImage(pngImage, {
      x: p.x * scaleX,
      y: pdfHeight - (p.y + p.height) * scaleY,
      width: p.width * scaleX,
      height: p.height * scaleY,
    })
  }

  return pdfDoc.save()
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1]! : dataUrl
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
