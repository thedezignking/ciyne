import type { InkColor } from '@/lib/refineSignature'

export type SignatureMode = 'draw' | 'type' | 'upload'

/**
 * The full editable state of the signature step, lifted to the page so it
 * survives navigation between steps. `raw*` fields hold the pre-refine source
 * for each mode; switching color/weight re-derives the final PNG from them.
 */
export type SignatureDraft = {
  mode: SignatureMode
  color: InkColor
  weight: number

  // Draw: full canvas snapshot (for restoring) + trimmed source.
  drawFull: string | null
  drawTrimmed: string | null

  // Type: text + font, plus the rendered trimmed source.
  typeText: string
  typeFontId: string
  typeTrimmed: string | null

  // Upload: the raw chosen photo, an optional AI-cropped version of it, and
  // the final background-removed trimmed source. The cleaner runs on the
  // cropped file when present, otherwise the raw photo.
  uploadFile: File | null
  uploadCropped: File | null
  uploadAiState: 'idle' | 'working' | 'cropped' | 'none' | 'unconfigured' | 'error'
  uploadTrimmed: string | null
}

export const emptyDraft: SignatureDraft = {
  mode: 'draw',
  color: 'navy',
  weight: 1.0,
  drawFull: null,
  drawTrimmed: null,
  typeText: '',
  typeFontId: 'dancing',
  typeTrimmed: null,
  uploadFile: null,
  uploadCropped: null,
  uploadAiState: 'idle',
  uploadTrimmed: null,
}
