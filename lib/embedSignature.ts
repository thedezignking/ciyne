import { PDFDocument, PDFName, PDFRawStream, PDFRef, PDFArray, StandardFonts, rgb } from 'pdf-lib'
import { inflateSync, deflateSync } from 'zlib'
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

function strToHex(s: string): string {
  return Buffer.from(s, 'binary').toString('hex').toUpperCase()
}

/**
 * Find all TJ array operators in a content stream string.
 * Handles parenthesized strings with escapes inside the array.
 */
function findTJArrays(content: string): { start: number; end: number; raw: string }[] {
  const results: { start: number; end: number; raw: string }[] = []
  let i = 0
  while (i < content.length) {
    if (content[i] === '[') {
      const start = i
      i++
      let depth = 1
      let inParen = false
      let escaped = false
      while (i < content.length && depth > 0) {
        if (escaped) { escaped = false; i++; continue }
        if (inParen) {
          if (content[i] === '\\') escaped = true
          else if (content[i] === ')') inParen = false
        } else {
          if (content[i] === '(') inParen = true
          else if (content[i] === ']') depth--
        }
        if (depth > 0) i++
      }
      i++
      const after = content.substring(i, i + 10).match(/^\s*TJ/)
      if (after) {
        const arrayContent = content.substring(start + 1, i - 1)
        const opEnd = i + after[0].length
        results.push({ start, end: opEnd, raw: arrayContent })
        i = opEnd
        continue
      }
    }
    i++
  }
  return results
}

/**
 * Extract the concatenated text from a TJ array's inner content.
 * Handles both literal `(text)` and hex `<hex>` strings.
 */
function extractTJText(arrayContent: string): string {
  const parts: string[] = []
  const re = /\(([^)]*(?:\\.[^)]*)*)\)|<([0-9A-Fa-f]+)>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(arrayContent)) !== null) {
    if (m[1] !== undefined) {
      parts.push(m[1].replace(/\\(.)/g, '$1'))
    } else if (m[2]) {
      parts.push(Buffer.from(m[2], 'hex').toString('binary'))
    }
  }
  return parts.join('')
}

/**
 * Replaces placeholder text directly in the PDF's content streams.
 *
 * Handles three text storage formats found in real PDFs:
 * 1. Hex strings: <5B596F7572204E616D655D> Tj
 * 2. Literal strings: ([Your Name]) Tj
 * 3. TJ arrays with kerning: [(I, ) 20 ([Your Name]) -15 (, agree.)] TJ
 *
 * Falls back to a white-rect + overlay only if the placeholder can't be
 * found in any of these formats.
 */
export async function embedFilledTextFields(
  pdfDoc: PDFDocument,
  fields: FilledTextField[]
): Promise<void> {
  if (fields.length === 0) return

  const pages = pdfDoc.getPages()
  const context = pdfDoc.context

  const byPage = new Map<number, FilledTextField[]>()
  for (const f of fields) {
    if (!f.value.trim() || f.pageIndex < 0 || f.pageIndex >= pages.length) continue
    const arr = byPage.get(f.pageIndex) ?? []
    arr.push(f)
    byPage.set(f.pageIndex, arr)
  }

  const fallbacks: FilledTextField[] = []

  for (const pageIndex of Array.from(byPage.keys())) {
    const pageFields = byPage.get(pageIndex)!
    const page = pages[pageIndex]
    const contentsEntry = page.node.get(PDFName.of('Contents'))
    if (!contentsEntry) {
      fallbacks.push(...pageFields)
      continue
    }

    const streamRefs: PDFRef[] = []
    if (contentsEntry instanceof PDFRef) {
      streamRefs.push(contentsEntry)
    } else if (contentsEntry instanceof PDFArray) {
      for (let i = 0; i < contentsEntry.size(); i++) {
        const el = contentsEntry.get(i)
        if (el instanceof PDFRef) streamRefs.push(el)
      }
    }

    const replaced = new Set<number>()

    for (const ref of streamRefs) {
      const stream = context.lookup(ref)
      if (!(stream instanceof PDFRawStream)) continue

      const filter = stream.dict.get(PDFName.of('Filter'))
      const isFlate = filter?.toString() === '/FlateDecode'

      let raw: Buffer
      try {
        raw = isFlate
          ? inflateSync(Buffer.from(stream.contents))
          : Buffer.from(stream.contents)
      } catch {
        continue
      }

      let text = raw.toString('binary')
      let modified = false

      // --- Pass 1: Replace in TJ arrays (most common in real PDFs) ---
      // Process in reverse order so character indices stay valid.
      const tjOps = findTJArrays(text)
      for (let oi = tjOps.length - 1; oi >= 0; oi--) {
        const op = tjOps[oi]
        const fullText = extractTJText(op.raw)
        let newText = fullText
        let changed = false

        for (let fi = 0; fi < pageFields.length; fi++) {
          if (replaced.has(fi)) continue
          const field = pageFields[fi]
          if (newText.includes(field.placeholder)) {
            newText = newText.split(field.placeholder).join(field.value)
            changed = true
            replaced.add(fi)
          }
        }

        if (changed) {
          const hexStr = '<' + strToHex(newText) + '> Tj'
          text = text.substring(0, op.start) + hexStr + text.substring(op.end)
          modified = true
        }
      }

      // --- Pass 2: Simple hex string replacement (pdf-lib style) ---
      for (let fi = 0; fi < pageFields.length; fi++) {
        if (replaced.has(fi)) continue
        const field = pageFields[fi]
        const hexSearch = strToHex(field.placeholder)
        const hexReplace = strToHex(field.value)
        const hexRegex = new RegExp(hexSearch, 'gi')
        if (hexRegex.test(text)) {
          text = text.replace(hexRegex, hexReplace)
          modified = true
          replaced.add(fi)
        }
      }

      // --- Pass 3: Literal parenthesized string replacement ---
      for (let fi = 0; fi < pageFields.length; fi++) {
        if (replaced.has(fi)) continue
        const field = pageFields[fi]
        const litSearch = field.placeholder.replace(/([()\\])/g, '\\$1')
        const litReplace = field.value.replace(/([()\\])/g, '\\$1')
        if (text.includes(litSearch)) {
          text = text.split(litSearch).join(litReplace)
          modified = true
          replaced.add(fi)
        }
      }

      if (modified) {
        const newRaw = Buffer.from(text, 'binary')
        const newContents = isFlate ? deflateSync(newRaw) : newRaw
        const newStream = PDFRawStream.of(stream.dict, newContents)
        context.assign(ref, newStream)
      }
    }

    for (let fi = 0; fi < pageFields.length; fi++) {
      if (!replaced.has(fi)) fallbacks.push(pageFields[fi])
    }
  }

  // Fallback: white rect + text overlay for fields not found in content streams
  if (fallbacks.length > 0) {
    console.warn('Text field fallback (overlay) for', fallbacks.length, 'fields — placeholder not found in content stream')
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    for (const field of fallbacks) {
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

      const fontSize = field.fontScale > 0
        ? field.fontScale * pdfHeight
        : rectH * 0.75

      page.drawText(field.value, {
        x: rectX,
        y: rectY + fontSize * 0.2,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
    }
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
