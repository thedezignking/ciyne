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
  /** Optional text annotations to embed alongside signatures. */
  textAnnotations?: TextAnnotation[]
  /** AI-detected text fields filled by the user. */
  filledTextFields?: FilledTextField[]
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

export type TextAnnotation = {
  id: string
  pageIndex: number
  x: number        // canvas-space
  y: number        // canvas-space
  width: number    // canvas-space
  fontSize: number // in points, for the final PDF
  text: string
  canvasWidth: number
  canvasHeight: number
}

/** A placeholder text field detected by AI on a PDF page.
 * Coordinates are normalized 0..1 relative to the page image. */
export type TextFieldDetection = {
  label: string
  placeholder: string
  x: number
  y: number
  width: number
  height: number
  /** Estimated font size of the placeholder as a fraction of page height. */
  fontScale: number
  /** Hex color of the surrounding text, e.g. "#000000". */
  fontColor: string
}

/** A user-filled text field ready for embedding into the PDF. */
export type FilledTextField = TextFieldDetection & {
  value: string
  pageIndex: number
}

export type AppStep = 1 | 2 | 3

export const MAX_PDF_BYTES = 20 * 1024 * 1024
export const ACCEPTED_SIGNATURE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
