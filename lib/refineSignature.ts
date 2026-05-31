export type InkColor = 'navy' | 'black' | 'original'

const COLORS: Record<'navy' | 'black', readonly [number, number, number]> = {
  navy: [43, 58, 103], // #2b3a67
  black: [26, 26, 30], // #1a1a1e
}

/**
 * Thickens a signature and optionally recolors it.
 *
 * Thickening is done by stamping the source image at a ring of small offsets,
 * which preserves the original colors and anti-aliasing. With 'navy' or 'black'
 * every inked pixel is then recolored for a clean, consistent look; with
 * 'original' the real ink colors are kept (useful for photos).
 */
export async function refineSignature(
  dataUrl: string,
  color: InkColor = 'navy'
): Promise<string> {
  const img = await loadImg(dataUrl)
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (w === 0 || h === 0) return dataUrl

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  // Stroke thickening: stamp the source at a ring of offsets.
  const r = Math.max(1, Math.round(Math.min(w, h) * 0.008))
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue // keep the stamp round
      ctx.drawImage(img, dx, dy)
    }
  }

  if (color === 'original') {
    return canvas.toDataURL('image/png')
  }

  // Recolor every inked pixel to the chosen ink, preserving alpha.
  const [cr, cg, cb] = COLORS[color]
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      data[i] = cr
      data[i + 1] = cg
      data[i + 2] = cb
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

function loadImg(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}
