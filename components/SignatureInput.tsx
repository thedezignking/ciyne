'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PenLine, Type, ImageUp, Sparkles, Loader2, Scissors } from 'lucide-react'
import SignaturePad from '@/components/SignaturePad'
import SignatureTyper from '@/components/SignatureTyper'
import SignatureUploader from '@/components/SignatureUploader'
import SignatureCleaner from '@/components/SignatureCleaner'
import { refineSignature, type InkColor } from '@/lib/refineSignature'
import { extractSignature } from '@/lib/extractSignature'
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
  useEffect(() => {
    const token = ++tokenRef.current
    if (!activeSource) {
      onSignature(null)
      return
    }
    void refineSignature(activeSource, color, weight).then((png) => {
      if (tokenRef.current === token) onSignature(png)
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

      {/* Ink + weight controls (shown once there is something to style) */}
      <InkControls
        options={colorOptions}
        color={color}
        onColorChange={(c) => onDraftChange({ color: c })}
        weight={weight}
        onWeightChange={(w) => onDraftChange({ weight: w })}
        disabled={!activeSource}
      />

      {/* Input panel */}
      {mode === 'draw' && (
        <SignaturePad
          color={color === 'black' ? SWATCH.black : SWATCH.navy}
          initialImage={draft.drawFull}
          onChange={(full, trimmed) => onDraftChange({ drawFull: full, drawTrimmed: trimmed })}
        />
      )}

      {mode === 'type' && (
        <SignatureTyper
          text={draft.typeText}
          fontId={draft.typeFontId}
          onTextChange={(t) => onDraftChange({ typeText: t })}
          onFontChange={(f) => onDraftChange({ typeFontId: f })}
          onRender={(trimmed) => onDraftChange({ typeTrimmed: trimmed })}
        />
      )}

      {mode === 'upload' && (
        <div className="space-y-6">
          <SignatureUploader
            currentName={draft.uploadFile?.name ?? null}
            onFile={(f) => onDraftChange({ uploadFile: f, uploadTrimmed: null })}
          />
          {draft.uploadFile && (
            <>
              <ExtractWithAI
                file={draft.uploadFile}
                onExtracted={(f) => onDraftChange({ uploadFile: f, uploadTrimmed: null })}
              />
              <SignatureCleaner
                sourceFile={draft.uploadFile}
                onCleaned={(_blob, dataUrl) => onDraftChange({ uploadTrimmed: dataUrl })}
              />
            </>
          )}
        </div>
      )}

      {/* Live preview of the final styled signature */}
      <LivePreview source={activeSource} color={color} weight={weight} />
    </div>
  )
}

function ExtractWithAI({
  file,
  onExtracted,
}: {
  file: File
  onExtracted: (f: File) => void
}) {
  const [status, setStatus] = useState<'idle' | 'working' | 'error' | 'unconfigured'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const run = useCallback(async () => {
    setStatus('working')
    setMessage(null)
    const result = await extractSignature(file)
    if (result.ok) {
      setStatus('idle')
      onExtracted(result.file)
      return
    }
    if (!result.configured) {
      setStatus('unconfigured')
    } else {
      setStatus('error')
      setMessage(result.error)
    }
  }, [file, onExtracted])

  return (
    <div className="rounded-2xl border border-border bg-page/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-primary">Messy photo? Extract with AI</p>
            <p className="text-xs text-secondary">
              Finds the signature in a cluttered photo and crops to it. Sends this image to an AI service.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={status === 'working'}
          className="focus-accent inline-flex items-center gap-2 rounded-full border border-accent-600/40 bg-surface px-4 py-2 text-sm font-semibold text-accent-600 transition-colors hover:bg-accent-50 disabled:opacity-60"
        >
          {status === 'working' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Scissors className="h-4 w-4" aria-hidden />
          )}
          {status === 'working' ? 'Extracting…' : 'Extract signature'}
        </button>
      </div>
      {status === 'unconfigured' && (
        <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted">
          AI extraction isn’t enabled on this deployment. The cleanup below still removes the background.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-3 border-t border-border/70 pt-3 text-xs text-red-600" role="alert">
          {message ?? 'Extraction failed.'} You can still use the cleanup below.
        </p>
      )}
    </div>
  )
}

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

function LivePreview({
  source,
  color,
  weight,
}: {
  source: string | null
  color: InkColor
  weight: number
}) {
  const [url, setUrl] = useState<string | null>(null)
  const tokenRef = useRef(0)
  useEffect(() => {
    const token = ++tokenRef.current
    if (!source) {
      setUrl(null)
      return
    }
    void refineSignature(source, color, weight).then((png) => {
      if (tokenRef.current === token) setUrl(png)
    })
  }, [source, color, weight])

  if (!source || !url) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Preview</p>
      <div className="flex min-h-[96px] items-center justify-center overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(#e7eaef_0%_25%,#f7f8fa_0%_50%)] bg-[length:16px_16px] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Signature preview" className="max-h-28 max-w-full object-contain" />
      </div>
    </div>
  )
}
