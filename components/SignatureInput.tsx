'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PenLine,
  Type,
  ImageUp,
  Sparkles,
  Loader2,
  Scissors,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react'
import SignaturePad from '@/components/SignaturePad'
import SignatureTyper from '@/components/SignatureTyper'
import SignatureUploader from '@/components/SignatureUploader'
import { refineSignature, type InkColor } from '@/lib/refineSignature'
import { extractSignature } from '@/lib/extractSignature'
import { DEFAULT_THRESHOLD, removeBackground } from '@/lib/removeBackground'
import type { SignatureDraft, SignatureMode } from '@/types/signatureDraft'

type SignatureInputProps = {
  draft: SignatureDraft
  onDraftChange: (patch: Partial<SignatureDraft>) => void
  /** Called with the final refined PNG (or null) whenever it changes. */
  onSignature: (dataUrl: string | null) => void
}

const TABS: { id: SignatureMode; label: string; icon: typeof PenLine }[] = [
  { id: 'draw', label: 'Draw', icon: PenLine },
  { id: 'type', label: 'Type', icon: Type },
  { id: 'upload', label: 'Upload photo', icon: ImageUp },
]

const SWATCH: Record<'navy' | 'black', string> = {
  navy: '#2b3a67',
  black: '#1a1a1e',
}

export default function SignatureInput({ draft, onDraftChange, onSignature }: SignatureInputProps) {
  const { mode, color, weight } = draft

  // The trimmed source for the active mode (pre-refine).
  const activeSource =
    mode === 'draw' ? draft.drawTrimmed : mode === 'type' ? draft.typeTrimmed : draft.uploadTrimmed

  // Re-derive the refined PNG whenever the source, color, or weight changes.
  // A token guards against out-of-order async results.
  const tokenRef = useRef(0)
  const [refinedUrl, setRefinedUrl] = useState<string | null>(null)
  useEffect(() => {
    const token = ++tokenRef.current
    if (!activeSource) {
      setRefinedUrl(null)
      onSignature(null)
      return
    }
    void refineSignature(activeSource, color, weight).then((png) => {
      if (tokenRef.current === token) {
        setRefinedUrl(png)
        onSignature(png)
      }
    })
  }, [activeSource, color, weight, onSignature])

  const switchMode = useCallback(
    (next: SignatureMode) => {
      if (next === mode) return
      const patch: Partial<SignatureDraft> = { mode: next }
      // 'original' only applies to photos.
      if (next !== 'upload' && color === 'original') patch.color = 'navy'
      onDraftChange(patch)
    },
    [mode, color, onDraftChange]
  )

  const colorOptions: InkColor[] = mode === 'upload' ? ['navy', 'black', 'original'] : ['navy', 'black']

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Signature method"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-page/60 p-1"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = tab.id === mode
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => switchMode(tab.id)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Draw mode: canvas with overlay preview + ink controls */}
      {mode === 'draw' && (
        <div className="space-y-4">
          <SignaturePad
            color={color === 'black' ? SWATCH.black : SWATCH.navy}
            initialImage={draft.drawFull}
            onChange={(full, trimmed) => onDraftChange({ drawFull: full, drawTrimmed: trimmed })}
            previewUrl={refinedUrl}
          />
          <InkControls
            options={colorOptions}
            color={color}
            onColorChange={(c) => onDraftChange({ color: c })}
            weight={weight}
            onWeightChange={(w) => onDraftChange({ weight: w })}
            disabled={!activeSource}
          />
        </div>
      )}

      {/* Type mode: typer with inline preview + ink controls */}
      {mode === 'type' && (
        <div className="space-y-4">
          <SignatureTyper
            text={draft.typeText}
            fontId={draft.typeFontId}
            onTextChange={(t) => onDraftChange({ typeText: t })}
            onFontChange={(f) => onDraftChange({ typeFontId: f })}
            onRender={(trimmed) => onDraftChange({ typeTrimmed: trimmed })}
            previewUrl={refinedUrl}
          />
          <InkControls
            options={colorOptions}
            color={color}
            onColorChange={(c) => onDraftChange({ color: c })}
            weight={weight}
            onWeightChange={(w) => onDraftChange({ weight: w })}
            disabled={!activeSource}
          />
        </div>
      )}

      {/* Upload mode: uploader + unified result card */}
      {mode === 'upload' && (
        <div className="space-y-5">
          <SignatureUploader
            currentName={draft.uploadFile?.name ?? null}
            onFile={(f) =>
              onDraftChange({
                uploadFile: f,
                uploadCropped: null,
                uploadAiState: 'idle',
                uploadTrimmed: null,
              })
            }
          />
          {draft.uploadFile && (
            <UploadResultCard
              file={draft.uploadFile}
              croppedFile={draft.uploadCropped}
              aiState={draft.uploadAiState}
              onAiState={(s) => onDraftChange({ uploadAiState: s })}
              onCropped={(f) =>
                onDraftChange({ uploadCropped: f, uploadAiState: 'cropped', uploadTrimmed: null })
              }
              onUseWholePhoto={() =>
                onDraftChange({ uploadCropped: null, uploadAiState: 'none', uploadTrimmed: null })
              }
              onCleaned={(dataUrl) => onDraftChange({ uploadTrimmed: dataUrl })}
              colorOptions={colorOptions}
              color={color}
              onColorChange={(c) => onDraftChange({ color: c })}
              weight={weight}
              onWeightChange={(w) => onDraftChange({ weight: w })}
              uploadTrimmed={draft.uploadTrimmed}
              refinedUrl={refinedUrl}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Unified upload result card
// ---------------------------------------------------------------------------

/**
 * Combines AI extraction status, background removal preview, ink controls,
 * and fine-tune cleanup into a single card that replaces the previous 3
 * separate components.
 */
function UploadResultCard({
  file,
  croppedFile,
  aiState,
  onAiState,
  onCropped,
  onUseWholePhoto,
  onCleaned,
  colorOptions,
  color,
  onColorChange,
  weight,
  onWeightChange,
  uploadTrimmed,
  refinedUrl,
}: {
  file: File
  croppedFile: File | null
  aiState: SignatureDraft['uploadAiState']
  onAiState: (s: SignatureDraft['uploadAiState']) => void
  onCropped: (f: File) => void
  onUseWholePhoto: () => void
  onCleaned: (dataUrl: string) => void
  colorOptions: InkColor[]
  color: InkColor
  onColorChange: (c: InkColor) => void
  weight: number
  onWeightChange: (w: number) => void
  uploadTrimmed: string | null
  refinedUrl: string | null
}) {
  // --- AI extraction logic (formerly AutoExtract) ---
  const [aiMessage, setAiMessage] = useState<string | null>(null)

  const onAiStateRef = useRef(onAiState)
  const onCroppedRef = useRef(onCropped)
  onAiStateRef.current = onAiState
  onCroppedRef.current = onCropped

  const runAi = useCallback(async () => {
    onAiStateRef.current('working')
    setAiMessage(null)
    const result = await extractSignature(file)
    if (result.ok) {
      onCroppedRef.current(result.file)
      return
    }
    if (!result.configured) {
      onAiStateRef.current('unconfigured')
    } else if (result.error === 'No signature found in the photo.') {
      onAiStateRef.current('none')
    } else {
      setAiMessage(result.error)
      onAiStateRef.current('error')
    }
  }, [file])

  // Auto-run AI exactly once while state is still 'idle'.
  useEffect(() => {
    if (aiState === 'idle') void runAi()
  }, [aiState, runAi])

  // --- Background removal logic (formerly inside SignatureCleaner) ---
  const [sensitivity, setSensitivity] = useState(DEFAULT_THRESHOLD)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cleaning, setCleaning] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)

  const onCleanedRef = useRef(onCleaned)
  onCleanedRef.current = onCleaned

  const sourceFile = croppedFile ?? file

  const processClean = useCallback(async () => {
    setCleaning(true)
    try {
      const blob = await removeBackground(sourceFile, sensitivity)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      setPreviewUrl(dataUrl)
      onCleanedRef.current(dataUrl)
    } finally {
      setCleaning(false)
    }
  }, [sourceFile, sensitivity])

  useEffect(() => {
    const timer = setTimeout(() => {
      void processClean()
    }, 200)
    return () => clearTimeout(timer)
  }, [processClean])

  // --- Derived state ---
  const aiWorking = aiState === 'working'
  const aiCropped = aiState === 'cropped'
  const aiFailed = aiState === 'none' || aiState === 'error' || aiState === 'unconfigured'

  // Status line text
  let statusText: string
  if (aiWorking) {
    statusText = 'Finding your signature…'
  } else if (cleaning && !previewUrl) {
    statusText = 'Removing background…'
  } else if (aiCropped) {
    statusText = 'AI extracted & cleaned'
  } else if (previewUrl) {
    statusText = 'Cleaned'
  } else {
    statusText = 'Processing…'
  }

  return (
    <div className="rounded-2xl border border-border bg-page/50 p-4 sm:p-5 space-y-4">
      {/* Status line */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          {aiWorking ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent-600" aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4 text-accent-600" aria-hidden />
          )}
          <span className="font-semibold text-primary">{statusText}</span>
        </div>

        <div className="flex items-center gap-2">
          {aiCropped && (
            <button
              type="button"
              onClick={onUseWholePhoto}
              className="focus-accent inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:text-primary"
            >
              Use whole photo
            </button>
          )}
          {aiFailed && (
            <button
              type="button"
              onClick={() => void runAi()}
              className="focus-accent inline-flex items-center gap-1.5 rounded-full border border-accent-600/40 bg-surface px-3 py-1.5 text-xs font-semibold text-accent-600 transition-colors hover:bg-accent-50"
            >
              <Scissors className="h-3.5 w-3.5" aria-hidden />
              Try AI again
            </button>
          )}
        </div>
      </div>

      {/* AI fallback notes — compact */}
      {aiState === 'unconfigured' && (
        <p className="text-xs text-muted">
          AI extraction isn&apos;t enabled on this deployment. The cleanup still removes the background.
        </p>
      )}
      {aiState === 'none' && (
        <p className="text-xs text-muted">
          AI couldn&apos;t pinpoint a signature, so we&apos;re cleaning the whole photo.
        </p>
      )}
      {aiState === 'error' && (
        <p className="text-xs text-red-600" role="alert">
          {aiMessage ?? 'Extraction failed.'} Cleaning the whole photo instead.
        </p>
      )}

      {/* Signature preview on checkerboard — shows the final refined result
           (ink color + weight) when available, otherwise the cleaned version. */}
      <div className="relative flex min-h-[140px] items-center justify-center overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(#e7eaef_0%_25%,#f7f8fa_0%_50%)] bg-[length:16px_16px] p-4">
        {(refinedUrl || previewUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={refinedUrl ?? previewUrl!}
            alt="Signature preview"
            className="max-h-44 max-w-full object-contain"
          />
        ) : (
          <p className="text-sm text-secondary">Processing…</p>
        )}

        {/* Spinner overlay while AI or cleaner is running */}
        {(aiWorking || (cleaning && previewUrl)) && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
            <Loader2 className="h-6 w-6 animate-spin text-accent-600" aria-hidden />
          </div>
        )}
      </div>

      {/* Inline ink controls */}
      <InkControls
        options={colorOptions}
        color={color}
        onColorChange={onColorChange}
        weight={weight}
        onWeightChange={onWeightChange}
        disabled={!uploadTrimmed}
      />

      {/* Collapsible fine-tune cleanup */}
      <div className="border-t border-border/70 pt-3">
        <button
          type="button"
          onClick={() => setShowAdjust((v) => !v)}
          aria-expanded={showAdjust}
          className="focus-accent flex w-full items-center justify-between rounded-lg text-xs font-semibold text-secondary transition-colors hover:text-primary"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Fine-tune cleanup
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showAdjust ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {showAdjust && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-secondary">Keep more</span>
              <span className="font-medium text-secondary">Remove more</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-accent-500"
              aria-label="Background removal sensitivity"
            />
            <p className="mt-2 text-xs text-muted">
              Drag left if parts of your signature disappear, right if any background remains.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ink controls (shared across all modes)
// ---------------------------------------------------------------------------

function InkControls({
  options,
  color,
  onColorChange,
  weight,
  onWeightChange,
  disabled,
}: {
  options: InkColor[]
  color: InkColor
  onColorChange: (c: InkColor) => void
  weight: number
  onWeightChange: (w: number) => void
  disabled: boolean
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Ink</span>
        {options.map((opt) => {
          const active = color === opt
          if (opt === 'original') {
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onColorChange('original')}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-accent-600 bg-accent-50 text-accent-600'
                    : 'border-border bg-surface text-secondary hover:text-primary'
                }`}
              >
                <span
                  className="block h-3.5 w-3.5 rounded-full"
                  style={{ background: 'conic-gradient(red, orange, gold, green, blue, violet, red)' }}
                  aria-hidden
                />
                Original
              </button>
            )
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onColorChange(opt)}
              aria-pressed={active}
              aria-label={`${opt} ink`}
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform ${
                active ? 'border-accent-600 scale-110' : 'border-border hover:border-border-strong'
              }`}
            >
              <span className="block h-4 w-4 rounded-full" style={{ background: SWATCH[opt] }} aria-hidden />
            </button>
          )
        })}
      </div>

      <label className="flex items-center gap-2 text-xs font-medium text-secondary">
        <span className="font-semibold uppercase tracking-wide">Weight</span>
        <input
          type="range"
          min={0.4}
          max={2}
          step={0.05}
          value={weight}
          onChange={(e) => onWeightChange(Number(e.target.value))}
          className="h-1.5 w-24 cursor-pointer accent-accent-600"
          aria-label="Stroke thickness"
        />
      </label>
    </div>
  )
}

