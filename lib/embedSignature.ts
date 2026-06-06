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

    const pdfFontSize = ann.fontSize * scaleY
    const pdfX = ann.x * scaleX
    const pdfY = pdfHeight - (ann.y + ann.fontSize) * scaleY

    page.drawText(ann.text, {
      x: pdfX,
      y: pdfY,
      size: pdfFontSize,
      font,
      color: rgb(0.1, 0.1, 0.12),
    })
  }
}

// ---------------------------------------------------------------------------
// Text field replacement — blank placeholder from content streams, then draw
// replacement text with pdf-lib so it appears native (no white rectangle).
// ---------------------------------------------------------------------------

function strToHex(s: string): string {
  return Buffer.from(s, 'binary').toString('hex').toUpperCase()
}

function spacesHex(len: number): string {
  return '20'.repeat(len)
}

/**
 * Find all TJ array operators in a content stream.
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
      const after = content.substring(i, i + 10).match(/^\s*TJ/i)
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
 * Extract concatenated text from a TJ array's elements.
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
 * In a TJ array, blank any literal `(text)` or hex `<hex>` elements that
 * contain parts of the placeholder by replacing their content with spaces.
 */
function blankPlaceholderInTJArray(arrayContent: string, placeholder: string): { blanked: string; found: boolean } {
  const fullText = extractTJText(arrayContent)
  if (!fullText.includes(placeholder)) return { blanked: arrayContent, found: false }

  let result = arrayContent
  const placeholderLower = placeholder.toLowerCase()

  // Replace in literal strings (text)
  result = result.replace(/\(([^)]*(?:\\.[^)]*)*)\)/g, (match, inner: string) => {
    const decoded = inner.replace(/\\(.)/g, '$1')
    if (placeholderLower.includes(decoded.toLowerCase()) || decoded.toLowerCase().includes(placeholderLower)) {
      // Check if this element's text is part of/contains the placeholder
      const spaces = ' '.repeat(inner.length)
      return `(${spaces})`
    }
    return match
  })

  // Replace in hex strings <hex>
  result = result.replace(/<([0-9A-Fa-f]+)>/g, (match, hex: string) => {
    const decoded = Buffer.from(hex, 'hex').toString('binary')
    if (placeholderLower.includes(decoded.toLowerCase()) || decoded.toLowerCase().includes(placeholderLower)) {
      return `<${spacesHex(decoded.length)}>`
    }
    return match
  })

  return { blanked: result, found: true }
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
 * Blanks placeholder text from PDF content streams, then draws replacement
 * text at the field position. This produces clean output: the original
 * placeholder disappears and the new text appears natively in its place.
 *
 * For fields where the placeholder can't be found in content streams (CID
 * fonts, unusual encodings), falls back to a white-rect overlay.
 */
export async function embedFilledTextFields(
  pdfDoc: PDFDocument,
  fields: FilledTextField[]
): Promise<void> {
  if (fields.length === 0) return

  const pages = pdfDoc.getPages()
  const context = pdfDoc.context
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const byPage = new Map<number, FilledTextField[]>()
  for (const f of fields) {
    if (!f.value.trim() || f.pageIndex < 0 || f.pageIndex >= pages.length) continue
    const arr = byPage.get(f.pageIndex) ?? []
    arr.push(f)
    byPage.set(f.pageIndex, arr)
  }

  const blanked = new Set<number>()

  // Phase 1: Blank placeholders from content streams
  for (const pageIndex of Array.from(byPage.keys())) {
    const pageFields = byPage.get(pageIndex)!
    const page = pages[pageIndex]
    const contentsEntry = page.node.get(PDFName.of('Contents'))
    if (!contentsEntry) continue

    const streamRefs: PDFRef[] = []
    if (contentsEntry instanceof PDFRef) {
      streamRefs.push(contentsEntry)
    } else if (contentsEntry instanceof PDFArray) {
      for (let i = 0; i < contentsEntry.size(); i++) {
        const el = contentsEntry.get(i)
        if (el instanceof PDFRef) streamRefs.push(el)
      }
    }

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

      // --- TJ arrays (most common in real PDFs) ---
      const tjOps = findTJArrays(text)
      for (let oi = tjOps.length - 1; oi >= 0; oi--) {
        const op = tjOps[oi]
        for (let fi = 0; fi < pageFields.length; fi++) {
          if (blanked.has(pageIndex * 1000 + fi)) continue
          const field = pageFields[fi]
          const { blanked: newArray, found } = blankPlaceholderInTJArray(op.raw, field.placeholder)
          if (found) {
            text = text.substring(0, op.start + 1) + newArray + text.substring(op.end - 2)
            modified = true
            blanked.add(pageIndex * 1000 + fi)
          }
        }
      }

      // --- Hex strings: <hex> Tj ---
      for (let fi = 0; fi < pageFields.length; fi++) {
        if (blanked.has(pageIndex * 1000 + fi)) continue
        const field = pageFields[fi]
        const hexSearch = strToHex(field.placeholder)
        const hexRegex = new RegExp(hexSearch, 'gi')
        if (hexRegex.test(text)) {
          text = text.replace(hexRegex, spacesHex(field.placeholder.length))
          modified = true
          blanked.add(pageIndex * 1000 + fi)
        }
      }

      // --- Literal strings: (text) Tj ---
      for (let fi = 0; fi < pageFields.length; fi++) {
        if (blanked.has(pageIndex * 1000 + fi)) continue
        const field = pageFields[fi]
        const escaped = field.placeholder.replace(/([()\\])/g, '\\$1')
        if (text.includes(escaped)) {
          const spaces = ' '.repeat(field.placeholder.length)
          text = text.split(escaped).join(spaces)
          modified = true
          blanked.add(pageIndex * 1000 + fi)
        }
      }

      if (modified) {
        const newRaw = Buffer.from(text, 'binary')
        const newContents = isFlate ? deflateSync(newRaw) : newRaw
        const newDict = stream.dict.clone(context)
        newDict.set(PDFName.of('Length'), context.obj(newContents.length))
        const newStream = PDFRawStream.of(newDict, newContents)
        context.assign(ref, newStream)
      }
    }
  }

  // Phase 2: Draw replacement text at each field position
  for (const pageIndex of Array.from(byPage.keys())) {
    const pageFields = byPage.get(pageIndex)!
    const page = pages[pageIndex]
    const { width: pdfWidth, height: pdfHeight } = page.getSize()

    for (let fi = 0; fi < pageFields.length; fi++) {
      const field = pageFields[fi]
      const wasBlanked = blanked.has(pageIndex * 1000 + fi)

      const rectX = field.x * pdfWidth
      const rectW = field.width * pdfWidth
      const rectH = field.height * pdfHeight
      const rectY = pdfHeight - (field.y + field.height) * pdfHeight

      // Only draw a white rect if we couldn't blank the placeholder from
      // the content stream — otherwise the space is already clear.
      if (!wasBlanked) {
        page.drawRectangle({
          x: rectX,
          y: rectY,
          width: rectW,
          height: rectH,
          color: rgb(1, 1, 1),
        })
      }

      const fontSize = field.fontScale > 0
        ? field.fontScale * pdfHeight
        : rectH * 0.7

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
