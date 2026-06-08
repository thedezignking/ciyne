'use client'

/**
 * Smart PDF embedding — the WPS-style approach:
 * 1. Uses pdf.js to locate exact text geometry for each placeholder field
 * 2. Extracts the embedded font from the PDF to reuse it (font doesn't change)
 * 3. Covers the precise text box with white
 * 4. Redraws replacement text in the SAME font, size, and color
 *
 * Falls back to Helvetica if font extraction fails (subset missing glyphs).
 */

import type { PDFDocument as PDFDocumentType } from 'pdf-lib'
import type {
  SignaturePlacement,
  TextAnnotation,
  FilledTextField,
} from '@/types'
import { extractPageText, findMatchingTextItem, findAllItemsInBox } from './pdfTextExtract'
import { extractFontsAsync, cleanFontName, matchFallbackFont } from './pdfFontExtract'
import type { PdfTextItem } from './pdfTextExtract'
import type { ExtractedFont } from './pdfFontExtract'

export type SmartEmbedInput = {
  pdfFile: File
  signaturePngBytes: Uint8Array
  placement?: SignaturePlacement
  placements?: SignaturePlacement[]
  textAnnotations?: TextAnnotation[]
  filledTextFields?: FilledTextField[]
}

type ResolvedField = FilledTextField & {
  matchedItem: PdfTextItem | null
  matchedFont: ExtractedFont | null
  allItems: PdfTextItem[]
}

export async function smartEmbed(input: SmartEmbedInput): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const fontkit = (await import('@pdf-lib/fontkit')).default

  const pdfBytes = await input.pdfFile.arrayBuffer()
  const pdfDoc = await PDFDocument.load(pdfBytes)
  pdfDoc.registerFontkit(fontkit)

  const pages = pdfDoc.getPages()
  const pngImage = await pdfDoc.embedPng(input.signaturePngBytes)

  // --- Embed signatures ---
  const allPlacements =
    input.placements && input.placements.length > 0
      ? input.placements
      : input.placement
        ? [input.placement]
        : []

  for (const p of allPlacements) {
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

  // --- Embed text annotations ---
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

  // --- Smart filled text fields ---
  if (input.filledTextFields && input.filledTextFields.length > 0) {
    const nonEmpty = input.filledTextFields.filter((f) => f.value.trim())
    if (nonEmpty.length > 0) {
      await embedFieldsSmart(pdfDoc, pdfBytes, nonEmpty)
    }
  }

  return pdfDoc.save()
}

async function embedFieldsSmart(
  pdfDoc: PDFDocumentType,
  originalPdfBytes: ArrayBuffer,
  fields: FilledTextField[]
): Promise<void> {
  const { StandardFonts, rgb } = await import('pdf-lib')
  const pages = pdfDoc.getPages()

  // Group fields by page
  const byPage = new Map<number, FilledTextField[]>()
  for (const f of fields) {
    if (f.pageIndex < 0 || f.pageIndex >= pages.length) continue
    const arr = byPage.get(f.pageIndex) ?? []
    arr.push(f)
    byPage.set(f.pageIndex, arr)
  }

  // Extract text geometry from original PDF for all affected pages
  const textDataByPage = new Map<number, Awaited<ReturnType<typeof extractPageText>>>()
  for (const pageIndex of Array.from(byPage.keys())) {
    try {
      const data = await extractPageText(originalPdfBytes, pageIndex)
      textDataByPage.set(pageIndex, data)
    } catch {
      // pdf.js extraction failed — will use approximate coords
    }
  }

  // Extract embedded fonts from the PDF
  let extractedFonts = new Map<string, ExtractedFont>()
  try {
    extractedFonts = await extractFontsAsync(originalPdfBytes)
  } catch {
    // Font extraction failed — will use fallback fonts
  }

  // Resolve each field: find its exact text item and font
  const resolvedFields: ResolvedField[] = fields.map((field) => {
    const textData = textDataByPage.get(field.pageIndex)
    let matchedItem: PdfTextItem | null = null
    let matchedFont: ExtractedFont | null = null
    let allItems: PdfTextItem[] = []

    if (textData) {
      matchedItem = findMatchingTextItem(
        textData.items,
        { x: field.x, y: field.y, width: field.width, height: field.height },
        field.placeholder
      )

      allItems = findAllItemsInBox(
        textData.items,
        { x: field.x, y: field.y, width: field.width, height: field.height }
      )

      if (matchedItem && matchedItem.fontName) {
        matchedFont = lookupFont(extractedFonts, matchedItem.fontName)
      }
    }

    return { ...field, matchedItem, matchedFont, allItems }
  })

  // Cache for embedded fonts (don't embed the same font bytes twice)
  const embeddedFontCache = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedFont>>>()

  // Get standard fallback fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const courier = await pdfDoc.embedFont(StandardFonts.Courier)
  const fallbackFonts = { helvetica, times, courier }

  for (const field of resolvedFields) {
    const page = pages[field.pageIndex]
    const { width: pdfWidth, height: pdfHeight } = page.getSize()

    let coverX: number, coverY: number, coverW: number, coverH: number
    let drawX: number, drawY: number, fontSize: number
    let embeddedFont = helvetica

    if (field.matchedItem) {
      const item = field.matchedItem

      // Compute the bounding box to cover — use ALL items in the box
      // so multi-run placeholders ("[Your", " ", "Name]") are fully covered.
      if (field.allItems.length > 1) {
        let minX = Infinity, maxX = -Infinity, minBaseY = Infinity, maxTopY = -Infinity
        for (const it of field.allItems) {
          minX = Math.min(minX, it.x)
          maxX = Math.max(maxX, it.x + it.width)
          minBaseY = Math.min(minBaseY, it.y)
          maxTopY = Math.max(maxTopY, it.y + it.height)
        }
        coverX = minX
        coverY = minBaseY
        coverW = maxX - minX
        coverH = maxTopY - minBaseY
      } else {
        coverX = item.x
        coverY = item.y
        coverW = item.width
        coverH = item.height
      }

      fontSize = item.fontSize
      // pdf-lib drawText positions at the baseline.
      // item.y IS the baseline (from pdf.js transform[5]).
      drawX = coverX
      drawY = item.y

      // Try to use the document's own font
      embeddedFont = await resolveEmbeddedFont(
        pdfDoc, field.matchedFont, field.matchedItem.fontName,
        embeddedFontCache, fallbackFonts
      )
    } else {
      // No pdf.js match — use the AI's approximate coordinates
      coverX = field.x * pdfWidth
      coverW = field.width * pdfWidth
      coverH = field.height * pdfHeight
      coverY = pdfHeight - (field.y + field.height) * pdfHeight

      fontSize = field.fontScale > 0 ? field.fontScale * pdfHeight : coverH * 0.7
      drawX = coverX
      // Approximate baseline: 25% up from the bottom of the box
      drawY = coverY + coverH * 0.25
    }

    // --- COVER: paint over the old text with white ---
    // Pad must cover descenders (~25% of fontSize below baseline) and
    // a bit of ascender overshoot above.
    const padV = Math.max(2, fontSize * 0.3)
    const padH = Math.max(2, fontSize * 0.1)
    page.drawRectangle({
      x: coverX - padH,
      y: coverY - padV,
      width: coverW + padH * 2,
      height: coverH + padV * 2,
      color: rgb(1, 1, 1),
      borderWidth: 0,
    })

    // --- REDRAW: write replacement text in the matched font ---
    const { r, g, b } = parseHexColor(field.fontColor || '#000000')

    page.drawText(field.value, {
      x: drawX,
      y: drawY,
      size: fontSize,
      font: embeddedFont,
      color: rgb(r, g, b),
      maxWidth: coverW > 0 ? coverW + padH * 2 : undefined,
    })
  }
}

/**
 * Look up an extracted font by pdf.js font name. pdf.js font names can be:
 *  - Internal names like "g_d0_f1"
 *  - BaseFont names like "BCDEEE+ArialMT" or "ArialMT"
 *  - Short names like "Arial"
 *
 * extractFontsAsync stores fonts under resource name, BaseFont, and cleaned name.
 */
function lookupFont(
  extractedFonts: Map<string, ExtractedFont>,
  pdfJsFontName: string
): ExtractedFont | null {
  // Direct lookup (resource name or BaseFont name)
  const direct = extractedFonts.get(pdfJsFontName)
  if (direct) return direct

  // Strip leading slash
  const clean = pdfJsFontName.replace(/^\//, '')
  const found = extractedFonts.get(clean)
  if (found) return found

  // Strip subset prefix
  const noSubset = cleanFontName(clean)
  const found2 = extractedFonts.get(noSubset)
  if (found2) return found2

  // Fuzzy: check if the pdf.js name contains or is contained by any key
  for (const [key, font] of Array.from(extractedFonts.entries())) {
    const cleanKey = cleanFontName(key).toLowerCase()
    const cleanSearch = noSubset.toLowerCase()
    if (cleanKey && cleanSearch && (cleanKey.includes(cleanSearch) || cleanSearch.includes(cleanKey))) {
      return font
    }
  }

  return null
}

/**
 * Resolve the best font to use for a field:
 * 1. Try embedding the document's own extracted font (truetype or opentype)
 * 2. Fall back to a matching standard font (Helvetica/Times/Courier)
 */
async function resolveEmbeddedFont(
  pdfDoc: PDFDocumentType,
  matchedFont: ExtractedFont | null,
  fontName: string,
  cache: Map<string, Awaited<ReturnType<typeof pdfDoc.embedFont>>>,
  fallbacks: Record<'helvetica' | 'times' | 'courier', Awaited<ReturnType<typeof pdfDoc.embedFont>>>
) {
  if (matchedFont && (matchedFont.type === 'truetype' || matchedFont.type === 'opentype')) {
    const cacheKey = matchedFont.name
    if (cache.has(cacheKey)) return cache.get(cacheKey)!

    try {
      const embedded = await pdfDoc.embedFont(matchedFont.bytes, { subset: false })
      cache.set(cacheKey, embedded)
      return embedded
    } catch {
      // Font embedding failed (subset missing glyphs, corrupt, etc.)
    }
  }

  // Fall back to the closest standard font
  const fallbackType = matchFallbackFont(matchedFont?.name || fontName)
  return fallbacks[fallbackType]
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
