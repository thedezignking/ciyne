export type InkColor = 'navy' | 'black' | 'original'

const COLORS: Record<'navy' | 'black', readonly [number, number, number]> = {
  navy: [43, 58, 103], // #2b3a67
  black: [26, 26, 30], // #1a1a1e
}

/**
 * Thickens a signature (stroke dilation) and optionally recolors it. With
 * 'navy' or 'black' every inked pixel is recolored for a clean, consistent
 * look. With 'original' the source colors are kept (useful for photos of a
 * signature in its real ink) while strokes are still thickened.
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
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  const n = w * h

  const alpha = new Uint8Array(n)
  for (let i = 0; i < n; i++) alpha[i] = data[i * 4 + 3]

  const radius = Math.max(1, Math.round(Math.min(w, h) * 0.008))
  const thick = dilate(alpha, w, h, radius)

  if (color === 'original') {
    // Keep source RGB; only apply the thickened alpha. Where dilation added
    // new coverage, sample the nearest opaque source pixel's color via a
    // simple fill so freshly thickened edges aren't transparent-colored.
    for (let i = 0; i < n; i++) {
      const a = thick[i]
      if (a > 0 && data[i * 4 + 3] === 0) {
        // Newly added edge pixel — borrow color from a nearby opaque pixel.
        const src = nearestOpaque(alpha, data, w, h, i)
        if (src >= 0) {
          data[i * 4] = data[src * 4]
          data[i * 4 + 1] = data[src * 4 + 1]
          data[i * 4 + 2] = data[src * 4 + 2]
        }
      }
      data[i * 4 + 3] = a
    }
  } else {
    const [r, g, b] = COLORS[color]
    for (let i = 0; i < n; i++) {
      data[i * 4] = r
      data[i * 4 + 1] = g
      data[i * 4 + 2] = b
      data[i * 4 + 3] = thick[i]
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

/** Finds the index of the closest originally-opaque pixel within a small ring. */
function nearestOpaque(
  alpha: Uint8Array,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  i: number
): number {
  const x = i % w
  const y = (i / w) | 0
  for (let r = 1; r <= 3; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const ny = y + dy
      if (ny < 0 || ny >= h) continue
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx
        if (nx < 0 || nx >= w) continue
        const j = ny * w + nx
        if (alpha[j] > 0 && data[j * 4 + 3] > 0) return j
      }
    }
  }
  return -1
}

function dilate(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const out = new Uint8Array(w * h)

  // Max-filter via separable passes (horizontal then vertical).
  const tmp = new Uint8Array(w * h)

  // Horizontal max
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      let mx = 0
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(w - 1, x + r)
      for (let xi = x0; xi <= x1; xi++) {
        const v = src[row + xi]
        if (v > mx) mx = v
      }
      tmp[row + x] = mx
    }
  }

  // Vertical max
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let mx = 0
      const y0 = Math.max(0, y - r)
      const y1 = Math.min(h - 1, y + r)
      for (let yi = y0; yi <= y1; yi++) {
        const v = tmp[yi * w + x]
        if (v > mx) mx = v
      }
      out[y * w + x] = mx
    }
  }

  return out
}

function loadImg(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}
