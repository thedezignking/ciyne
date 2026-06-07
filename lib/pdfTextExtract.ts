'use client'

/**
 * Extracts text items from a PDF page with exact positions using pdf.js.
 * Each item includes the text string, bounding box in PDF coordinates
 * (origin bottom-left), font name, and font size.
 */

export type PdfTextItem = {
  str: string
  x: number
  y: number
  width: number
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
    const x = tx[4]
    // pdf.js transform Y is from bottom-left; convert to top-left
    const yBottom = tx[5]
    const height = fontSize
    const width = item.width || 0
    // Y from top (for normalized coords)
    const yTop = pageHeight - yBottom - height

    items.push({
      str: item.str,
      x,
      y: yBottom,
      width,
      height,
      fontName: item.fontName || '',
      fontSize,
      norm: {
        x: x / pageWidth,
        y: yTop / pageHeight,
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
 * Uses overlap/proximity scoring.
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

    // Center-to-center distance as a tiebreaker
    const dx = (fieldNorm.x + fieldNorm.width / 2) - (item.norm.x + item.norm.width / 2)
    const dy = (fieldNorm.y + fieldNorm.height / 2) - (item.norm.y + item.norm.height / 2)
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Score: high overlap is good, low distance is good
    let score = overlapArea / (fieldArea || 1) - dist * 0.5

    // Bonus if the text contains the placeholder string
    if (fieldText && item.str.toLowerCase().includes(fieldText.toLowerCase())) {
      score += 2
    }

    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }

  // Only accept if there's at least some proximity
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
  padding = 0.01
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
