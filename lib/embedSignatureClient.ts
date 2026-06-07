'use client'

import type {
  SignaturePlacement,
  TextAnnotation,
  FilledTextField,
} from '@/types'

export type ClientEmbedInput = {
  pdfBytes: ArrayBuffer
  signaturePngBytes: Uint8Array
  /** Single placement (legacy) — used when `placements` is empty. */
  placement?: SignaturePlacement
  placements?: SignaturePlacement[]
  textAnnotations?: TextAnnotation[]
  filledTextFields?: FilledTextField[]
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(clean.substring(0, 2), 16) / 255,
    g: parseInt(clean.substring(2, 4), 16) / 255,
    b: parseInt(clean.substring(4, 6), 16) / 255,
  }
}

/**
 * Builds the fully signed PDF in the browser using pdf-lib — no server round
 * trip. This avoids Vercel's 4.5 MB request-body limit (the source of the 413
 * errors) and produces the downloadable blob entirely on-device, which also
 * sidesteps iOS download issues.
 */
export async function embedSignatureClient(
  input: ClientEmbedInput
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

  const pdfDoc = await PDFDocument.load(input.pdfBytes)
  const pages = pdfDoc.getPages()
  const pngImage = await pdfDoc.embedPng(input.signaturePngBytes)

  // --- Signature(s) ---
  const placements =
    input.placements && input.placements.length > 0
      ? input.placements
      : input.placement
        ? [input.placement]
        : []

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

  // --- Text annotations ---
  if (input.textAnnotations && input.textAnnotations.length > 0) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    for (const ann of input.textAnnotations) {
      if (ann.pageIndex < 0 || ann.pageIndex >= pages.length) continue
      if (!ann.text.trim()) continue
      const page = pages[ann.pageIndex]
      const { width: pdfWidth, height: pdfHeight } = page.getSize()
      const scaleX = pdfWidth / ann.canvasWidth
      const scaleY = pdfHeight / ann.canvasHeight
      page.drawText(ann.text, {
        x: ann.x * scaleX,
        y: pdfHeight - (ann.y + ann.fontSize) * scaleY,
        size: ann.fontSize * scaleY,
        font,
        color: rgb(0.1, 0.1, 0.12),
      })
    }
  }

  // --- Filled text fields (white-rect overlay + native text) ---
  if (input.filledTextFields && input.filledTextFields.length > 0) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    for (const field of input.filledTextFields) {
      if (!field.value.trim()) continue
      if (field.pageIndex < 0 || field.pageIndex >= pages.length) continue
      const page = pages[field.pageIndex]
      const { width: pdfWidth, height: pdfHeight } = page.getSize()

      const rectX = field.x * pdfWidth
      const rectW = field.width * pdfWidth
      const rectH = field.height * pdfHeight
      const rectY = pdfHeight - (field.y + field.height) * pdfHeight

      page.drawRectangle({
        x: rectX,
        y: rectY,
        width: rectW,
        height: rectH,
        color: rgb(1, 1, 1),
      })

      const fontSize = field.fontScale > 0 ? field.fontScale * pdfHeight : rectH * 0.7
      const { r, g, b } = parseHexColor(field.fontColor || '#000000')
      page.drawText(field.value, {
        x: rectX,
        y: rectY + rectH * 0.25,
        size: fontSize,
        font,
        color: rgb(r, g, b),
        maxWidth: rectW,
      })
    }
  }

  return pdfDoc.save()
}
