/**
 * Crops the transparent margins off a canvas and returns a PNG data URL of just
 * the inked region (with a little padding). Returns null if the canvas is empty.
 */
export function trimToDataUrl(canvas: HTMLCanvasElement, padding = 12): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  const { width, height } = canvas
  const { data } = ctx.getImageData(0, 0, width, height)

  let top = height
  let left = width
  let right = 0
  let bottom = 0
  let found = false

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 8) {
        found = true
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }

  if (!found) return null

  const x0 = Math.max(0, left - padding)
  const y0 = Math.max(0, top - padding)
  const cropW = Math.min(width, right + padding) - x0
  const cropH = Math.min(height, bottom + padding) - y0

  const out = document.createElement('canvas')
  out.width = cropW
  out.height = cropH
  const outCtx = out.getContext('2d')
  if (!outCtx) return null
  outCtx.drawImage(canvas, x0, y0, cropW, cropH, 0, 0, cropW, cropH)

  return out.toDataURL('image/png')
}
