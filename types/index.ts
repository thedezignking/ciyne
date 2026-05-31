export type SignaturePlacement = {
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  canvasWidth: number
  canvasHeight: number
}

export type ProcessPayload = SignaturePlacement & {
  signatureImage: string
  /** When set, embed the signature on every listed placement (sign-all). */
  placements?: SignaturePlacement[]
}

/** A signature/date/initial field located on a page by AI, in normalized
 * [0..1] coordinates relative to the page (origin top-left). */
export type DetectedField = {
  label: string
  x: number
  y: number
  width: number
  height: number
  confidence?: number
}

export type AppStep = 1 | 2 | 3

export const MAX_PDF_BYTES = 20 * 1024 * 1024
export const ACCEPTED_SIGNATURE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
