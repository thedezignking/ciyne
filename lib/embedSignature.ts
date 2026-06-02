import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { SignaturePlacement, TextAnnotation, FilledTextField } from '@/types'

export type EmbedSignatureInput = SignaturePlacement & {
  pdfBytes: ArrayBuffer
  signaturePngBytes: Uint8Array
  textAnnotations?: TextAnnotation[]
  filledTextFields?: FilledTextField[]
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

  if (input.textAnnotations && input.textAnnotations.length > 0) {
    await embedTextAnnotations(pdfDoc, input.textAnnotations)
  }
  if (input.filledTextFields && input.filledTextFields.length > 0) {
    await embedFilledTextFields(pdfDoc, input.filledTextFields)
  }

  return pdfDoc.save()
}

/**
 * Embeds the same signature PNG at multiple placements in one pass — loads
 * and saves the document only once. Coordinates are in canvas space.
 */
export async function embedSignatures(
  pdfBytes: ArrayBuffer,
  signaturePngBytes: Uint8Array,
  placements: Placement[],
  textAnnotations?: TextAnnotation[],
  filledTextFields?: FilledTextField[]
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

  if (textAnnotations && textAnnotations.length > 0) {
    await embedTextAnnotations(pdfDoc, textAnnotations)
  }
  if (filledTextFields && filledTextFields.length > 0) {
    await embedFilledTextFields(pdfDoc, filledTextFields)
  }

  return pdfDoc.save()
}

/**
 * Embeds text annotations onto the PDF pages using a standard font.
 * Coordinates are converted from canvas-space to PDF-space the same way
 * signatures are.
 */
export async function embedTextAnnotations(
  pdfDoc: PDFDocument,
  annotations: TextAnnotation[]
): Promise<void> {
  if (annotations.length === 0) return

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const ann of annotations) {
    if (ann.pageIndex < 0 || ann.pageIndex >= pages.length) continue
    if (!ann.text.trim()) continue

    const page = pages[ann.pageIndex]
    const { width: pdfWidth, height: pdfHeight } = page.getSize()
    const scaleX = pdfWidth / ann.canvasWidth
    const scaleY = pdfHeight / ann.canvasHeight

    // Convert canvas font size to PDF points using the vertical scale factor.
    const pdfFontSize = ann.fontSize * scaleY

    // X maps directly; Y is flipped (PDF origin is bottom-left).
    // ann.y is the top of the text box in canvas-space. The baseline sits
    // roughly one line-height down from the top.
    const pdfX = ann.x * scaleX
    const pdfY = pdfHeight - (ann.y + ann.fontSize) * scaleY

    page.drawText(ann.text, {
      x: pdfX,
      y: pdfY,
      size: pdfFontSize,
      font,
      color: rgb(0.1, 0.1, 0.12), // #1a1a1e approx
    })
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

/**
 * Replaces placeholder text in the PDF with user-provided values.
 *
 * Uses the AI-detected font size and color so the replacement text matches
 * the surrounding document text. A white rectangle covers the original
 * placeholder flush to its bounds, then the new text is drawn at the same
 * baseline — making the edit visually indistinguishable from native text.
 */
export async function embedFilledTextFields(
  pdfDoc: PDFDocument,
  fields: FilledTextField[]
): Promise<void> {
  if (fields.length === 0) return

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const field of fields) {
    if (!field.value.trim()) continue
    if (field.pageIndex < 0 || field.pageIndex >= pages.length) continue

    const page = pages[field.pageIndex]
    const { width: pdfWidth, height: pdfHeight } = page.getSize()

    const rectX = field.x * pdfWidth
    const rectW = field.width * pdfWidth
    const rectH = field.height * pdfHeight
    const rectY = pdfHeight - (field.y + field.height) * pdfHeight

    // Cover the placeholder flush — no extra padding so no visible white border
    page.drawRectangle({
      x: rectX,
      y: rectY,
      width: rectW,
      height: rectH,
      color: rgb(1, 1, 1),
    })

    // Use the AI-detected font size (as fraction of page height) converted to points.
    // Fall back to fitting inside the field height if fontScale is missing.
    const fontSize = field.fontScale > 0
      ? field.fontScale * pdfHeight
      : rectH * 0.75

    // Match the document's text color from the AI detection
    const { r, g, b } = hexToRgb(field.fontColor || '#000000')

    // Position baseline: the bottom of the field box, offset up by the
    // font descender (~20% of font size). This aligns the text baseline
    // with where the original text sat.
    const descenderOffset = fontSize * 0.2
    const textY = rectY + descenderOffset

    page.drawText(field.value, {
      x: rectX,
      y: textY,
      size: fontSize,
      font,
      color: rgb(r, g, b),
    })
  }
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
