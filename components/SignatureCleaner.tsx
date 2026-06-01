'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Wand2, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { DEFAULT_THRESHOLD, removeBackground } from '@/lib/removeBackground'

type SignatureCleanerProps = {
  sourceFile: File
  onCleaned: (blob: Blob, dataUrl: string) => void
}

export default function SignatureCleaner({ sourceFile, onCleaned }: SignatureCleanerProps) {
  // 0–100 sensitivity; 50 = automatic (Otsu + flat-field) baseline.
  const [sensitivity, setSensitivity] = useState(DEFAULT_THRESHOLD)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)

  const onCleanedRef = useRef(onCleaned)
  onCleanedRef.current = onCleaned

  const process = useCallback(async () => {
    setProcessing(true)
    try {
      const blob = await removeBackground(sourceFile, sensitivity)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      setPreviewUrl(dataUrl)
      onCleanedRef.current(blob, dataUrl)
    } finally {
      setProcessing(false)
    }
  }, [sourceFile, sensitivity])

  useEffect(() => {
    const timer = setTimeout(() => {
      void process()
    }, 200)
    return () => clearTimeout(timer)
  }, [process])

  return (
    <div className="rounded-2xl border border-border bg-page/50 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
          <Wand2 className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-primary">Background removed</p>
          <p className="text-xs text-secondary">
            We auto-corrected shadows and cleared the paper behind your signature.
          </p>
        </div>
      </div>

      {/* Preview on a checkerboard so transparency is obvious */}
      <div className="mt-4 flex min-h-[140px] items-center justify-center overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(#e7eaef_0%_25%,#f7f8fa_0%_50%)] bg-[length:16px_16px] p-4">
        {processing && !previewUrl ? (
          <p className="text-sm text-secondary">Processing…</p>
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Cleaned signature preview"
            className="max-h-44 max-w-full object-contain"
          />
        ) : null}
      </div>

      {/* Fine-tune — hidden by default; the auto result is usually enough. */}
      <div className="mt-4 border-t border-border/70 pt-3">
        <button
          type="button"
          onClick={() => setShowAdjust((v) => !v)}
          aria-expanded={showAdjust}
          className="focus-accent flex w-full items-center justify-between rounded-lg text-xs font-semibold text-secondary transition-colors hover:text-primary"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Fine-tune the cleanup
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
