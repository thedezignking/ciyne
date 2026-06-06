'use client'

import { renderPdfPage } from './renderPdfPage'
import type { FilledTextField } from '@/types'

/**
 * Creates a brand new PDF by:
 * 1. Sending the original PDF to the server to blank placeholders from content streams
 * 2. Rendering each cleaned page as a high-res image
 * 3. Drawing replacement text on the canvas (no white rect — the space is already clear)
 * 4. Building a completely new PDF from those rendered images
 *
 * The result is a fresh PDF file, not the old one modified.
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

  // Step 1: Send to server to blank placeholders from content streams
  const placeholders = nonEmpty.map((f) => ({
    pageIndex: f.pageIndex,
    placeholder: f.placeholder,
  }))

  const formData = new FormData()
  formData.append('pdf', originalFile)
  formData.append('placeholders', JSON.stringify(placeholders))

  let cleanedFile: File
  try {
    const res = await fetch('/api/blank-fields', { method: 'POST', body: formData })
    if (!res.ok) {
      console.warn('Blank-fields API failed, using original PDF')
      cleanedFile = originalFile
    } else {
      const blob = await res.blob()
      cleanedFile = new File([blob], originalFile.name, { type: 'application/pdf' })
    }
  } catch {
    console.warn('Blank-fields API unreachable, using original PDF')
    cleanedFile = originalFile
  }

  // Step 2: Load PDF with pdf-lib and render pages
  const { PDFDocument } = await import('pdf-lib')

  const cleanedBytes = await cleanedFile.arrayBuffer()
  const srcDoc = await PDFDocument.load(cleanedBytes)
  const srcPages = srcDoc.getPages()
  const newDoc = await PDFDocument.create()

  for (let i = 0; i < srcPages.length; i++) {
    const pageFields = byPage.get(i)
    const { width: pdfW, height: pdfH } = srcPages[i].getSize()

    if (!pageFields) {
      // No modifications — copy the original page verbatim
      const [copied] = await newDoc.copyPages(srcDoc, [i])
      newDoc.addPage(copied)
      continue
    }

    // Step 3: Render the CLEANED page (placeholders should be gone)
    const { canvas } = await renderPdfPage(cleanedFile, i, 3)
    const ctx = canvas.getContext('2d')!

    // Draw replacement text in the now-empty placeholder areas
    for (const field of pageFields) {
      const cx = field.x * canvas.width
      const cy = field.y * canvas.height
      const cw = field.width * canvas.width
      const ch = field.height * canvas.height

      const fontSize = Math.max(10, field.fontScale * canvas.height)
      ctx.fillStyle = field.fontColor || '#000000'
      ctx.font = `${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`
      ctx.textBaseline = 'middle'
      ctx.fillText(field.value, cx + 2, cy + ch / 2, cw - 4)
    }

    // Step 4: Export as high-quality JPEG and create image-based page
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    const base64 = dataUrl.split(',')[1]!
    const binary = atob(base64)
    const jpegBytes = new Uint8Array(binary.length)
    for (let j = 0; j < binary.length; j++) jpegBytes[j] = binary.charCodeAt(j)

    const img = await newDoc.embedJpg(jpegBytes)
    const page = newDoc.addPage([pdfW, pdfH])
    page.drawImage(img, { x: 0, y: 0, width: pdfW, height: pdfH })
  }

  const newPdfBytes = await newDoc.save()
  return new File(
    [newPdfBytes.buffer as ArrayBuffer],
    originalFile.name,
    { type: 'application/pdf' }
  )
}
