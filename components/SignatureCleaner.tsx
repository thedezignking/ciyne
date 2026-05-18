'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-semibold text-primary">Background removal</p>
        <label className="flex items-center gap-3 text-sm text-secondary">
          <span className="shrink-0">Threshold</span>
          <input
            type="range"
            min={180}
            max={250}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer accent-accent-500"
          />
          <span className="w-8 text-right font-medium text-primary">{threshold}</span>
        </label>
        <p className="mt-2 text-xs text-muted">
          Increase if signature edges are cut off; decrease if background remains.
        </p>
      </div>
      <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-border bg-[repeating-conic-gradient(#e2e5eb_0%_25%,#f4f5f7_0%_50%)] bg-[length:16px_16px] p-4">
        {processing && !previewUrl ? (
          <p className="text-sm text-secondary">Processing…</p>
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Cleaned signature preview"
            className="max-h-40 max-w-full object-contain"
          />
        ) : null}
      </div>
    </div>
  )
}
