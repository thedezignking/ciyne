const NAVY = [43, 58, 103] as const // #2b3a67

export async function refineSignature(dataUrl: string): Promise<string> {
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

  for (let i = 0; i < n; i++) {
    data[i * 4] = NAVY[0]
    data[i * 4 + 1] = NAVY[1]
    data[i * 4 + 2] = NAVY[2]
    data[i * 4 + 3] = thick[i]
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
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
