import { PDFDocument } from 'pdf-lib'
import type { SignaturePlacement } from '@/types'

export type EmbedSignatureInput = SignaturePlacement & {
  pdfBytes: ArrayBuffer
  signaturePngBytes: Uint8Array
}

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
