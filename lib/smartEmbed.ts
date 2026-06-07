'use client'

/**
 * Smart PDF embedding — the WPS-style approach:
 * 1. Uses pdf.js to locate exact text geometry for each placeholder field
 * 2. Extracts the embedded font from the PDF to reuse it (font doesn't change)
 * 3. Covers the precise text box with background-matched color
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
      await embedFieldsSmart(pdfDoc, pdfBytes, nonEmpty, fontkit)
    }
  }

  return pdfDoc.save()
}

async function embedFieldsSmart(
  pdfDoc: PDFDocumentType,
  originalPdfBytes: ArrayBuffer,
  fields: FilledTextField[],
  fontkit: unknown
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
      // pdf.js extraction failed for this page — will use approximate coords
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
      // Find the text item that matches this field's position
      matchedItem = findMatchingTextItem(
        textData.items,
        { x: field.x, y: field.y, width: field.width, height: field.height },
        field.placeholder
      )

      // Also find ALL items in the box (placeholder might span multiple items)
      allItems = findAllItemsInBox(
        textData.items,
        { x: field.x, y: field.y, width: field.width, height: field.height }
      )

      // Try to find the matching font
      if (matchedItem && matchedItem.fontName) {
        matchedFont = extractedFonts.get(matchedItem.fontName) ?? null
        // Try without the leading slash
        if (!matchedFont) {
          const cleanName = matchedItem.fontName.replace(/^\//, '')
          for (const [key, font] of Array.from(extractedFonts.entries())) {
            if (key.includes(cleanName) || cleanName.includes(cleanFontName(key))) {
              matchedFont = font
              break
            }
          }
        }
      }
    }

    return { ...field, matchedItem, matchedFont, allItems }
  })

  // Cache for embedded fonts (don't embed the same font twice)
  const embeddedFontCache = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedFont>>>()

  // Get standard fallback fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const courier = await pdfDoc.embedFont(StandardFonts.Courier)

  const fallbackFonts = { helvetica, times, courier }

  for (const field of resolvedFields) {
    const page = pages[field.pageIndex]
    const { width: pdfWidth, height: pdfHeight } = page.getSize()

    // Determine the precise cover area
    let coverX: number, coverY: number, coverW: number, coverH: number
    let drawX: number, drawY: number, fontSize: number
    let embeddedFont = helvetica // default

    if (field.matchedItem) {
      // We have exact geometry from pdf.js — use it!
      const item = field.matchedItem

      // If multiple items span the box, compute the combined bounding box
      if (field.allItems.length > 1) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
        for (const it of field.allItems) {
          const itX = it.norm.x * pdfWidth
          const itY = (1 - it.norm.y - it.norm.height) * pdfHeight
          minX = Math.min(minX, itX)
          maxX = Math.max(maxX, itX + it.norm.width * pdfWidth)
          minY = Math.min(minY, itY)
          maxY = Math.max(maxY, itY + it.norm.height * pdfHeight)
        }
        coverX = minX
        coverY = minY
        coverW = maxX - minX
        coverH = maxY - minY
      } else {
        coverX = item.x
        coverY = item.y
        coverW = item.width
        coverH = item.height
      }

      fontSize = item.fontSize
      drawX = coverX
      // Baseline: text draws from the baseline, which is roughly 20% above the bottom
      drawY = coverY

      // Try to use the document's own font
      if (field.matchedFont && field.matchedFont.type === 'truetype') {
        try {
          const cacheKey = field.matchedFont.name
          if (embeddedFontCache.has(cacheKey)) {
            embeddedFont = embeddedFontCache.get(cacheKey)!
          } else {
            embeddedFont = await pdfDoc.embedFont(field.matchedFont.bytes, { subset: false })
            embeddedFontCache.set(cacheKey, embeddedFont)
          }
        } catch {
          // Font embedding failed (likely subset missing glyphs)
          // Fall back to a matching standard font
          const fallbackType = matchFallbackFont(field.matchedFont.name)
          embeddedFont = fallbackFonts[fallbackType]
        }
      } else if (field.matchedFont && field.matchedFont.type === 'opentype') {
        try {
          const cacheKey = field.matchedFont.name
          if (embeddedFontCache.has(cacheKey)) {
            embeddedFont = embeddedFontCache.get(cacheKey)!
          } else {
            embeddedFont = await pdfDoc.embedFont(field.matchedFont.bytes, { subset: false })
            embeddedFontCache.set(cacheKey, embeddedFont)
          }
        } catch {
          const fallbackType = matchFallbackFont(field.matchedFont.name)
          embeddedFont = fallbackFonts[fallbackType]
        }
      } else if (field.matchedItem.fontName) {
        // No extracted font bytes but we know the name — match to standard
        const fallbackType = matchFallbackFont(field.matchedItem.fontName)
        embeddedFont = fallbackFonts[fallbackType]
      }
    } else {
      // No pdf.js match — fall back to field's approximate coordinates
      coverX = field.x * pdfWidth
      coverW = field.width * pdfWidth
      coverH = field.height * pdfHeight
      coverY = pdfHeight - (field.y + field.height) * pdfHeight
      fontSize = field.fontScale > 0 ? field.fontScale * pdfHeight : coverH * 0.7
      drawX = coverX
      drawY = coverY + coverH * 0.25
    }

    // --- COVER: paint over the old text with white ---
    // Add padding to ensure no leftover anti-aliased pixels
    const pad = Math.max(1, coverH * 0.08)
    page.drawRectangle({
      x: coverX - pad,
      y: coverY - pad,
      width: coverW + pad * 2,
      height: coverH + pad * 2,
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
      maxWidth: coverW + pad * 2,
    })
  }
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
