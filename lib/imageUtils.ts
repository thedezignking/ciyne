/**
 * Shared client-side image helpers.
 *
 * Two cross-platform safeguards live here:
 *  - A hard cap on canvas dimensions. iOS Safari silently produces a blank
 *    canvas past ~16.7M pixels / 4096px per side, and large allocations OOM
 *    low-RAM Android. Capping the longest edge keeps every canvas well under
 *    those limits while staying sharp enough for signatures and previews.
 *  - A timeout on image decoding so a stalled load on a flaky mobile network
 *    rejects instead of hanging a step forever.
 */

/** Longest-edge cap for any canvas we allocate from a user image. */
export const MAX_IMAGE_EDGE = 2200

const DEFAULT_TIMEOUT_MS = 15000

/** Scale factor (≤1) needed to fit w×h within `max` on its longest edge. */
export function fitScale(w: number, h: number, max = MAX_IMAGE_EDGE): number {
  const longest = Math.max(w, h)
  return longest > max ? max / longest : 1
}

/** Decode an image from any src (data/blob/object URL) with a timeout. */
export function loadImageSrc(src: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const timer = setTimeout(() => {
      img.onload = img.onerror = null
      reject(new Error('Image load timed out'))
    }, timeoutMs)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error('Image failed to load'))
    }
    img.src = src
  })
}

/** Decode an image from a File, revoking the temporary object URL afterwards. */
export async function loadImageFile(file: File, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    return await loadImageSrc(url, timeoutMs)
  } finally {
    URL.revokeObjectURL(url)
  }
}
