'use client'

/**
 * Extracts text items from a PDF page with exact positions using pdf.js.
 * Each item includes the text string, bounding box in PDF coordinates
 * (origin bottom-left), font name, and font size.
 */

export type PdfTextItem = {
  str: string
  /** X coordinate in PDF points (from left) */
  x: number
  /** Y coordinate = baseline in PDF points (from bottom) */
  y: number
  /** Width of the text run in PDF points */
  width: number
  /** Height of the text run in PDF points (= fontSize) */
  height: number
  fontName: string
  fontSize: number
  /** Normalized coords (0-1) relative to page, origin top-left — matches AI field coords */
  norm: { x: number; y: number; width: number; height: number }
}

export type PageTextData = {
  items: PdfTextItem[]
  pageWidth: number
  pageHeight: number
}

async function getPdfJs() {
  const pdfjs = await import('pdfjs-dist')
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  }
  return pdfjs
}

/**
 * Get all text items from a specific page with their exact geometry.
 */
export async function extractPageText(
  pdfBytes: ArrayBuffer,
  pageIndex: number
): Promise<PageTextData> {
  const pdfjs = await getPdfJs()
  const pdf = await pdfjs.getDocument({ data: pdfBytes.slice(0) }).promise
  const page = await pdf.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale: 1 })
  const textContent = await page.getTextContent()

  const pageWidth = viewport.width
  const pageHeight = viewport.height

  const items: PdfTextItem[] = []

  for (const item of textContent.items) {
    if (!('str' in item) || !item.str.trim()) continue

    // transform is [scaleX, skewY, skewX, scaleY, translateX, translateY]
    const tx = item.transform
    const fontSize = Math.abs(tx[3]) || Math.abs(tx[0])
    if (fontSize <= 0) continue

    const x = tx[4]
    // tx[5] is the baseline Y position (from page bottom)
    const baselineY = tx[5]
    const width = item.width || 0
    const height = fontSize

    // For normalized coords (origin top-left, 0-1):
    // The top of the text is approximately baseline + ascent ≈ baseline + fontSize * 0.8
    // We use the full fontSize as the box height for matching purposes
    const yTop = pageHeight - baselineY - height

    items.push({
      str: item.str,
      x,
      y: baselineY,
      width,
      height,
      fontName: item.fontName || '',
      fontSize,
      norm: {
        x: x / pageWidth,
        y: Math.max(0, yTop / pageHeight),
        width: width / pageWidth,
        height: height / pageHeight,
      },
    })
  }

  pdf.destroy()
  return { items, pageWidth, pageHeight }
}

/**
 * Find the text item that best matches a given normalized bounding box.
 * Uses overlap + proximity + text-content scoring.
 */
export function findMatchingTextItem(
  items: PdfTextItem[],
  fieldNorm: { x: number; y: number; width: number; height: number },
  fieldText?: string
): PdfTextItem | null {
  let best: PdfTextItem | null = null
  let bestScore = -Infinity

  for (const item of items) {
    // Calculate overlap between field box and text item box
    const overlapX = Math.max(
      0,
      Math.min(fieldNorm.x + fieldNorm.width, item.norm.x + item.norm.width) -
        Math.max(fieldNorm.x, item.norm.x)
    )
    const overlapY = Math.max(
      0,
      Math.min(fieldNorm.y + fieldNorm.height, item.norm.y + item.norm.height) -
        Math.max(fieldNorm.y, item.norm.y)
    )
    const overlapArea = overlapX * overlapY
    const fieldArea = fieldNorm.width * fieldNorm.height

    // Center-to-center distance
    const dx = (fieldNorm.x + fieldNorm.width / 2) - (item.norm.x + item.norm.width / 2)
    const dy = (fieldNorm.y + fieldNorm.height / 2) - (item.norm.y + item.norm.height / 2)
    const dist = Math.sqrt(dx * dx + dy * dy)

    let score = overlapArea / (fieldArea || 1) - dist * 0.5

    // Strong bonus if the text contains the placeholder string
    if (fieldText && item.str.toLowerCase().includes(fieldText.toLowerCase())) {
      score += 5
    }
    // Partial bonus for substring overlap
    if (fieldText && fieldText.toLowerCase().includes(item.str.toLowerCase()) && item.str.length > 2) {
      score += 2
    }

    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }

  if (bestScore < -0.5) return null
  return best
}

/**
 * Find ALL text items that fall within a field's bounding box.
 * Placeholder text might span multiple TJ items.
 */
export function findAllItemsInBox(
  items: PdfTextItem[],
  fieldNorm: { x: number; y: number; width: number; height: number },
  padding = 0.015
): PdfTextItem[] {
  const fx = fieldNorm.x - padding
  const fy = fieldNorm.y - padding
  const fw = fieldNorm.width + padding * 2
  const fh = fieldNorm.height + padding * 2

  return items.filter((item) => {
    const cx = item.norm.x + item.norm.width / 2
    const cy = item.norm.y + item.norm.height / 2
    return cx >= fx && cx <= fx + fw && cy >= fy && cy <= fy + fh
  })
}
