// Sensitivity runs 0–100 in the UI. 50 is "neutral" (use the auto threshold as-is);
// higher removes more (keeps less), lower removes less (keeps more).
export const DEFAULT_THRESHOLD = 50

export type RemoveBackgroundOptions = {
  /** 0–100 sensitivity. 50 = auto. Higher strips more background. */
  sensitivity?: number
}

/**
 * Removes the paper background from a signature photo, robust to shadows and
 * uneven lighting. Fully client-side.
 *
 * Approach:
 *  1. Grayscale.
 *  2. Flat-field correction: estimate the local background brightness with a
 *     large-radius box blur (via an integral image, O(n)) and divide each pixel
 *     by it. This cancels shadows and lighting gradients so the ink stands out
 *     evenly across the whole image.
 *  3. Otsu's method picks an automatic global threshold on the corrected image.
 *  4. A sensitivity slider nudges that threshold.
 *  5. Soft alpha near the threshold gives anti-aliased edges instead of a harsh
 *     1-bit cutout.
 */
export async function removeBackground(
  file: File,
  sensitivity = DEFAULT_THRESHOLD
): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas not supported')

  ctx.drawImage(img, 0, 0)
  const w = canvas.width
  const h = canvas.height
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  const n = w * h

  // 1. Grayscale (luma).
  const gray = new Float32Array(n)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  // 2. Flat-field correction via local mean (box blur from an integral image).
  // Radius scales with image size so it spans shadows but not strokes.
  const radius = Math.max(8, Math.round(Math.min(w, h) * 0.08))
  const background = boxBlur(gray, w, h, radius)

  const corrected = new Float32Array(n)
  for (let p = 0; p < n; p++) {
    // pixel / local-background, clamped. ~1.0 means "as bright as its
    // surroundings" (paper); well below 1.0 means darker than surroundings (ink).
    const bg = background[p] || 1
    corrected[p] = Math.min(255, (gray[p] / bg) * 200)
  }

  // 3. Otsu threshold on the corrected image.
  const otsu = otsuThreshold(corrected, n)

  // 4. Apply sensitivity: map 0–100 to a ± offset around the auto threshold.
  // 50 -> 0; 0 -> -40 (keep more); 100 -> +40 (remove more).
  const offset = ((sensitivity - 50) / 50) * 40
  const threshold = otsu + offset

  // 5. Soft alpha: ramp over a small band around the threshold for clean edges.
  const band = 18
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const v = corrected[p]
    let alpha: number
    if (v >= threshold + band) {
      alpha = 0 // clearly background
    } else if (v <= threshold - band) {
      alpha = 255 // clearly ink
    } else {
      alpha = Math.round(((threshold + band - v) / (band * 2)) * 255)
    }
    // Combine with any existing alpha so transparent source PNGs stay transparent.
    data[i + 3] = Math.min(data[i + 3], alpha)
  }

  ctx.putImageData(imageData, 0, 0)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? new Blob()), 'image/png')
  })
}

/** O(n) box blur using a summed-area table (integral image). */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  // Integral image with a zero-padded top/left row/col, (w+1) x (h+1).
  const iw = w + 1
  const integral = new Float64Array(iw * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      rowSum += src[y * w + x]
      integral[(y + 1) * iw + (x + 1)] = integral[y * iw + (x + 1)] + rowSum
    }
  }

  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(h - 1, y + r)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(w - 1, x + r)
      const a = integral[y0 * iw + x0]
      const b = integral[y0 * iw + (x1 + 1)]
      const c = integral[(y1 + 1) * iw + x0]
      const d = integral[(y1 + 1) * iw + (x1 + 1)]
      const area = (x1 - x0 + 1) * (y1 - y0 + 1)
      out[y * w + x] = (d - b - c + a) / area
    }
  }
  return out
}

/** Otsu's method: the threshold that maximizes between-class variance. */
function otsuThreshold(values: Float32Array, n: number): number {
  const hist = new Array(256).fill(0)
  for (let p = 0; p < n; p++) {
    const v = values[p]
    const bin = v < 0 ? 0 : v > 255 ? 255 : v | 0
    hist[bin]++
  }

  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * hist[t]

  let sumB = 0
  let wB = 0
  let maxVar = -1
  let threshold = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = n - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > maxVar) {
      maxVar = between
      threshold = t
    }
  }
  return threshold
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = reject
    image.src = url
  })
}
