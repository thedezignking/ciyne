'use client'

/**
 * Extracts embedded font programs from a PDF using pdf-lib's low-level API.
 * Returns the raw font bytes (TTF/OTF/Type1) that can be re-embedded with fontkit.
 *
 * Fonts are keyed by BOTH the resource dict name ("/F1") AND the BaseFont name
 * ("ArialMT", "BCDEEE+TimesNewRomanPSMT") so callers can look up by either.
 */

import { PDFDocument, PDFDict, PDFName, PDFRef, PDFRawStream, PDFArray } from 'pdf-lib'

export type ExtractedFont = {
  name: string
  baseFontName: string
  bytes: Uint8Array
  type: 'truetype' | 'opentype' | 'type1'
  isSubset: boolean
}

function resolveDict(pdfDoc: PDFDocument, obj: unknown): PDFDict | null {
  if (!obj) return null
  if (obj instanceof PDFRef) obj = pdfDoc.context.lookup(obj)
  if (obj instanceof PDFDict) return obj
  return null
}

function resolveStream(pdfDoc: PDFDocument, obj: unknown): PDFRawStream | null {
  if (!obj) return null
  if (obj instanceof PDFRef) obj = pdfDoc.context.lookup(obj)
  if (obj instanceof PDFRawStream) return obj
  return null
}

function isFontSignature(data: Uint8Array): boolean {
  if (data.length < 4) return false
  if (data[0] === 0x00 && data[1] === 0x01 && data[2] === 0x00 && data[3] === 0x00) return true
  if (data[0] === 0x4F && data[1] === 0x54 && data[2] === 0x54 && data[3] === 0x4F) return true
  if (data[0] === 0x74 && data[1] === 0x72 && data[2] === 0x75 && data[3] === 0x65) return true
  if (data[0] === 0x25 && data[1] === 0x21) return true
  if (data[0] === 0x77 && data[1] === 0x4F && data[2] === 0x46 && data[3] === 0x46) return true
  return false
}

async function decompressStreamAsync(stream: PDFRawStream): Promise<Uint8Array> {
  const raw = new Uint8Array(stream.contents)
  if (isFontSignature(raw)) return raw

  const filter = stream.dict.get(PDFName.of('Filter'))
  if (filter?.toString() !== '/FlateDecode') return raw

  if (typeof DecompressionStream !== 'undefined') {
    // FlateDecode = zlib format → DecompressionStream('deflate') handles it
    try {
      const ds = new DecompressionStream('deflate')
      const writer = ds.writable.getWriter()
      const reader = ds.readable.getReader()
      writer.write(raw)
      writer.close()

      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      const totalLen = chunks.reduce((sum, c) => sum + c.length, 0)
      const result = new Uint8Array(totalLen)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      return result
    } catch {
      // DecompressionStream failed
    }
  }

  return raw
}

async function extractFontFromDictAsync(
  pdfDoc: PDFDocument,
  fontDict: PDFDict,
  resourceName: string
): Promise<ExtractedFont | null> {
  let descriptor = resolveDict(pdfDoc, fontDict.get(PDFName.of('FontDescriptor')))

  // For Type0 (CID) fonts, dig into DescendantFonts
  const subtype = fontDict.get(PDFName.of('Subtype'))
  if (subtype?.toString() === '/Type0') {
    const descendants = fontDict.get(PDFName.of('DescendantFonts'))
    if (descendants instanceof PDFArray && descendants.size() > 0) {
      const firstDesc = resolveDict(pdfDoc, descendants.get(0))
      if (firstDesc) {
        const cidDescriptor = resolveDict(pdfDoc, firstDesc.get(PDFName.of('FontDescriptor')))
        if (cidDescriptor) descriptor = cidDescriptor
      }
    }
  }

  if (!descriptor) return null

  const baseFont = fontDict.get(PDFName.of('BaseFont'))?.toString().replace(/^\//, '') || resourceName

  const sources: { key: string; type: 'truetype' | 'opentype' | 'type1' }[] = [
    { key: 'FontFile2', type: 'truetype' },
    { key: 'FontFile3', type: 'opentype' },
    { key: 'FontFile', type: 'type1' },
  ]

  for (const { key, type } of sources) {
    const stream = resolveStream(pdfDoc, descriptor.get(PDFName.of(key)))
    if (!stream) continue

    const bytes = await decompressStreamAsync(stream)
    if (bytes.length > 0) {
      return {
        name: baseFont,
        baseFontName: baseFont,
        bytes,
        type,
        isSubset: /^[A-Z]{6}\+/.test(baseFont),
      }
    }
  }

  return null
}

/**
 * Async font extraction — the only entry point used in production.
 * Decompresses streams using DecompressionStream API.
 *
 * Returns fonts keyed by BOTH:
 *  - Resource dict name ("F1", "TT2") — for pdf-lib lookups
 *  - BaseFont name ("ArialMT", "BCDEEE+TimesNewRomanPSMT") — for pdf.js lookups
 *  - Cleaned BaseFont name ("ArialMT", "TimesNewRomanPSMT") — without subset prefix
 */
export async function extractFontsAsync(pdfBytes: ArrayBuffer): Promise<Map<string, ExtractedFont>> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const fonts = new Map<string, ExtractedFont>()
  const seen = new Set<string>()

  const pages = pdfDoc.getPages()
  for (const page of pages) {
    // Resolve Resources — it might be a PDFRef (inherited from page tree)
    const resolvedResources = resolveDict(pdfDoc, page.node.get(PDFName.of('Resources')))
    if (!resolvedResources) continue

    const resolvedFontDict = resolveDict(pdfDoc, resolvedResources.get(PDFName.of('Font')))
    if (!resolvedFontDict) continue

    const entries = resolvedFontDict.entries()
    for (const [nameObj, valueObj] of entries) {
      const resourceName = nameObj instanceof PDFName ? nameObj.decodeText() : String(nameObj)
      if (seen.has(resourceName)) continue
      seen.add(resourceName)

      const fontDef = resolveDict(pdfDoc, valueObj)
      if (!fontDef) continue

      const extracted = await extractFontFromDictAsync(pdfDoc, fontDef, resourceName)
      if (!extracted) continue

      // Store under the resource dict name ("/F1" → "F1")
      fonts.set(resourceName, extracted)

      // Store under the full BaseFont name ("BCDEEE+ArialMT")
      if (extracted.baseFontName && !fonts.has(extracted.baseFontName)) {
        fonts.set(extracted.baseFontName, extracted)
      }

      // Store under the cleaned name without subset prefix ("ArialMT")
      const cleaned = cleanFontName(extracted.baseFontName)
      if (cleaned && cleaned !== extracted.baseFontName && !fonts.has(cleaned)) {
        fonts.set(cleaned, extracted)
      }
    }
  }

  return fonts
}

/**
 * Maps a PDF internal font name (like "/F3" or "ABCDEF+Helvetica-Bold")
 * to a clean human-readable base name for fallback matching.
 */
export function cleanFontName(rawName: string): string {
  let name = rawName.replace(/^[A-Z]{6}\+/, '')
  name = name.replace(/^\//, '')
  return name
}

/**
 * Match a font name to one of our bundled fallback fonts.
 */
export function matchFallbackFont(fontName: string): 'helvetica' | 'times' | 'courier' {
  const lower = cleanFontName(fontName).toLowerCase()
  if (/courier|mono|consol/i.test(lower)) return 'courier'
  if (/times|roman|serif|garamond|palatino|georgia/i.test(lower)) return 'times'
  return 'helvetica'
}
