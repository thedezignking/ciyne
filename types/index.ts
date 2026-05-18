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
}

export type AppStep = 1 | 2 | 3

export const MAX_PDF_BYTES = 20 * 1024 * 1024
export const ACCEPTED_SIGNATURE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
