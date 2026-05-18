const DEFAULT_THRESHOLD = 220

export async function removeBackground(
  source: File | Blob,
  threshold = DEFAULT_THRESHOLD
): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  ctx.drawImage(bitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = imageData

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r > threshold && g > threshold && b > threshold) {
      data[i + 3] = 0
    }
  }

  ctx.putImageData(imageData, 0, 0)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to export PNG'))),
      'image/png'
    )
  })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'))
    reader.readAsDataURL(blob)
  })
}

export { DEFAULT_THRESHOLD }
