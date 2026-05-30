'use client'

import { useCallback, useEffect, useState } from 'react'
import { Wand2 } from 'lucide-react'
import { DEFAULT_THRESHOLD, removeBackground } from '@/lib/removeBackground'

type SignatureCleanerProps = {
  sourceFile: File
  onCleaned: (blob: Blob, dataUrl: string) => void
}

export default function SignatureCleaner({ sourceFile, onCleaned }: SignatureCleanerProps) {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const process = useCallback(async () => {
    setProcessing(true)
    try {
      const blob = await removeBackground(sourceFile, threshold)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      setPreviewUrl(dataUrl)
      onCleaned(blob, dataUrl)
    } finally {
      setProcessing(false)
    }
  }, [sourceFile, threshold, onCleaned])

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
          <p className="text-xs text-secondary">We cleared the paper behind your signature.</p>
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

      {/* Fine-tune */}
      <div className="mt-4">
        <label className="flex items-center gap-3 text-sm">
          <span className="shrink-0 font-medium text-secondary">Fine-tune</span>
          <input
            type="range"
            min={180}
            max={250}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-accent-500"
            aria-label="Background removal threshold"
          />
          <span className="w-9 text-right font-semibold tabular-nums text-primary">{threshold}</span>
        </label>
        <p className="mt-2 text-xs text-muted">
          Slide right if signature edges get cut off, left if background remains.
        </p>
      </div>
    </div>
  )
}
