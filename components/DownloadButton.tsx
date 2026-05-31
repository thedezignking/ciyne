'use client'

import { useEffect, useState } from 'react'
import { Download, Check, RotateCcw, Share2 } from 'lucide-react'
import type { ProcessPayload } from '@/types'

type DownloadButtonProps = {
  pdfFile: File
  payload: ProcessPayload | null
  disabled?: boolean
}

type ReadyState = {
  url: string
  filename: string
  file: File
}

export default function DownloadButton({ pdfFile, payload, disabled }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState<ReadyState | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [canShareFiles, setCanShareFiles] = useState(false)

  // Detect file-sharing support after mount (mobile) so we can offer it as a
  // secondary action without making it the default — download stays primary.
  useEffect(() => {
    try {
      const probe = new File([new Blob()], 'probe.pdf', { type: 'application/pdf' })
      setCanShareFiles(
        typeof navigator !== 'undefined' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [probe] })
      )
    } catch {
      setCanShareFiles(false)
    }
  }, [])

  async function handleProcess() {
    if (!payload) return
    setLoading(true)
    setError(null)
    setSavedAt(null)
    // Clear any previous result so we don't show stale download
    if (ready) {
      URL.revokeObjectURL(ready.url)
      setReady(null)
    }

    try {
      const formData = new FormData()
      formData.append('originalPDF', pdfFile)
      formData.append('signatureImage', payload.signatureImage)
      formData.append('pageIndex', String(payload.pageIndex))
      formData.append('x', String(payload.x))
      formData.append('y', String(payload.y))
      formData.append('width', String(payload.width))
      formData.append('height', String(payload.height))
      formData.append('canvasWidth', String(payload.canvasWidth))
      formData.append('canvasHeight', String(payload.canvasHeight))
      if (payload.placements && payload.placements.length > 0) {
        formData.append('placements', JSON.stringify(payload.placements))
      }

      const res = await fetch('/api/process', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Download failed')
      }

      const blob = await res.blob()
      const filename = (pdfFile.name.replace(/\.pdf$/i, '') || 'signed') + '-signed.pdf'
      const url = URL.createObjectURL(blob)
      const file = new File([blob], filename, { type: 'application/pdf' })

      // Don't trigger download here — just store the result and render a
      // "Save PDF" button. When the user taps that button it's a fresh user
      // gesture, which means iOS Safari won't block navigator.share or
      // window.open. This is the only reliable mobile download pattern.
      setReady({ url, filename, file })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Direct download — the default action. Called from a fresh user tap so
  // iOS Safari keeps the gesture context valid.
  function handleDownload() {
    if (!ready) return
    const { url, filename } = ready
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setSavedAt(new Date())
  }

  // Explicit, opt-in share sheet for sending the PDF to another app.
  async function handleShare() {
    if (!ready) return
    const { filename, file } = ready
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename })
        setSavedAt(new Date())
        return
      } catch (err) {
        // User dismissed the share sheet — not an error.
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    // No share support — fall back to a download.
    handleDownload()
  }

  // Signed & saved — show a confirmation worth screenshotting.
  if (savedAt && ready) {
    const time = savedAt.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    return (
      <div className="rounded-2xl border border-accent-600/30 bg-accent-50/60 p-5">
        <div className="flex items-start gap-4">
          <span className="animate-check-pop flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white shadow-sm">
            <Check className="h-6 w-6 stroke-[2.5]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-primary">Your document is signed</p>
            <p className="mt-0.5 truncate text-sm font-medium text-secondary">{ready.filename}</p>
            <p className="mt-1 text-xs text-muted">Signed {time}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleDownload}
            className="focus-accent inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-border-strong"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download again
          </button>
          {canShareFiles && (
            <button
              type="button"
              onClick={() => void handleShare()}
              className="focus-accent inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-border-strong"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleProcess()}
            className="focus-accent inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-secondary transition-colors hover:text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Re-apply signature
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {!ready ? (
        <button
          type="button"
          disabled={disabled || !payload || loading}
          onClick={() => void handleProcess()}
          className="focus-accent inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-7 py-3.5 text-sm font-semibold text-[var(--btn-primary-fg)] transition-colors hover:bg-[var(--btn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Download className="h-4 w-4" aria-hidden />
          {loading ? 'Applying signature…' : 'Apply signature & download'}
        </button>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleDownload}
            className="focus-accent inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-600 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:opacity-90 sm:w-auto"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download signed PDF
          </button>
          {canShareFiles && (
            <button
              type="button"
              onClick={() => void handleShare()}
              className="focus-accent inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-7 py-3.5 text-sm font-semibold text-primary transition-colors hover:border-border-strong sm:w-auto"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleProcess()}
            className="text-sm text-[var(--text-muted)] underline-offset-2 hover:underline"
          >
            Re-apply
          </button>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
