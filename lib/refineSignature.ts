import { loadImageSrc } from '@/lib/imageUtils'

export type InkColor = 'navy' | 'black' | 'original'

const COLORS: Record<'navy' | 'black', readonly [number, number, number]> = {
  navy: [43, 58, 103], // #2b3a67
  black: [26, 26, 30], // #1a1a1e
}

/**
 * Thickens or thins a signature and optionally recolors it.
 *
 * `weight` is centered on 1.0 (the raw stroke, unchanged):
 *   - weight < 1  → erode the alpha (thinner strokes)
 *   - weight = 1  → source unchanged
 *   - weight > 1  → dilate (thicker strokes)
 *
 * With 'navy'/'black' every inked pixel is recolored for a clean, consistent
 * look. With 'original' the real ink colors are kept (useful for photos):
 * dilation stamps the real pixels, erosion just trims the alpha.
 */
export async function refineSignature(
  dataUrl: string,
  color: InkColor = 'navy',
  weight = 1.0
): Promise<string> {
  const img = await loadImageSrc(dataUrl)
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (w === 0 || h === 0) return dataUrl

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  // Radius in pixels, scaled to the image. Centered on weight 1.0.
  const span = Math.min(w, h) * 0.014
  const radius = Math.round((weight - 1) * span)

  if (color === 'original' && radius >= 0) {
    // Dilate by stamping the real source pixels so colors are preserved.
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue
        ctx.drawImage(img, dx, dy)
      }
    }
    return canvas.toDataURL('image/png')
  }

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  const n = w * h

  // Source alpha → morphology (dilate for radius>0, erode for radius<0).
  const srcA = new Uint8ClampedArray(n)
  for (let i = 0; i < n; i++) srcA[i] = data[i * 4 + 3]
  const outA = radius === 0 ? srcA : morph(srcA, w, h, Math.abs(radius), radius > 0 ? 'max' : 'min')

  if (color === 'original') {
    // Erosion only here: keep RGB, trim alpha to the eroded mask.
    for (let i = 0; i < n; i++) {
      data[i * 4 + 3] = Math.min(data[i * 4 + 3], outA[i])
    }
  } else {
    const [cr, cg, cb] = COLORS[color]
    for (let i = 0; i < n; i++) {
      data[i * 4] = cr
      data[i * 4 + 1] = cg
      data[i * 4 + 2] = cb
      data[i * 4 + 3] = outA[i]
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

/** Separable morphological filter (max = dilate, min = erode) on a single channel. */
function morph(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  r: number,
  op: 'max' | 'min'
): Uint8ClampedArray {
  if (r < 1) return src
  const pick = op === 'max' ? Math.max : Math.min
  const tmp = new Uint8ClampedArray(w * h)
  const out = new Uint8ClampedArray(w * h)

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      let acc = src[row + x]
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(w - 1, x + r)
      for (let xi = x0; xi <= x1; xi++) acc = pick(acc, src[row + xi])
      tmp[row + x] = acc
    }
  }
  // Vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let acc = tmp[y * w + x]
      const y0 = Math.max(0, y - r)
      const y1 = Math.min(h - 1, y + r)
      for (let yi = y0; yi <= y1; yi++) acc = pick(acc, tmp[yi * w + x])
      out[y * w + x] = acc
    }
  }
  return out
}
