'use client'

import { renderPdfPage } from './renderPdfPage'
import type { FilledTextField } from '@/types'

/**
 * Replaces placeholder text by rendering affected pages as high-res images
 * with the placeholders painted over and new text drawn in place. Unmodified
 * pages are copied verbatim from the original PDF so they keep full fidelity.
 */
export async function fillTextFieldsInPdf(
  file: File,
  fields: FilledTextField[]
): Promise<File> {
  const nonEmpty = fields.filter((f) => f.value.trim())
  if (nonEmpty.length === 0) return file

  const byPage = new Map<number, FilledTextField[]>()
  for (const f of nonEmpty) {
    const arr = byPage.get(f.pageIndex) ?? []
    arr.push(f)
    byPage.set(f.pageIndex, arr)
  }

  const { PDFDocument } = await import('pdf-lib')

  const pdfBytes = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(pdfBytes)
  const srcPages = srcDoc.getPages()
  const newDoc = await PDFDocument.create()

  for (let i = 0; i < srcPages.length; i++) {
    const pageFields = byPage.get(i)

    if (!pageFields) {
      const [copied] = await newDoc.copyPages(srcDoc, [i])
      newDoc.addPage(copied)
      continue
    }

    const { width: pdfW, height: pdfH } = srcPages[i].getSize()
    const { canvas } = await renderPdfPage(file, i, 3)
    const ctx = canvas.getContext('2d')!

    for (const field of pageFields) {
      const cx = field.x * canvas.width
      const cy = field.y * canvas.height
      const cw = field.width * canvas.width
      const ch = field.height * canvas.height

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx, cy, cw, ch)

      const fontSize = Math.max(10, field.fontScale * canvas.height)
      ctx.fillStyle = field.fontColor || '#000000'
      ctx.font = `${fontSize}px sans-serif`
      ctx.textBaseline = 'middle'
      ctx.fillText(field.value, cx + 2, cy + ch / 2, cw - 4)
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const base64 = dataUrl.split(',')[1]!
    const binary = atob(base64)
    const jpegBytes = new Uint8Array(binary.length)
    for (let j = 0; j < binary.length; j++) jpegBytes[j] = binary.charCodeAt(j)

    const img = await newDoc.embedJpg(jpegBytes)
    const page = newDoc.addPage([pdfW, pdfH])
    page.drawImage(img, { x: 0, y: 0, width: pdfW, height: pdfH })
  }

  const newPdfBytes = await newDoc.save()
  return new File([newPdfBytes.buffer as ArrayBuffer], file.name, { type: 'application/pdf' })
}
