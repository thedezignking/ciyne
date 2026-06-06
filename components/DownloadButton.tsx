'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Check, PenLine, Share2 } from 'lucide-react'
import type { ProcessPayload } from '@/types'

type DownloadButtonProps = {
  pdfFile: File
  payload: ProcessPayload | null
  disabled?: boolean
  onEditSignature?: () => void
}

type ReadyState = {
  url: string
  filename: string
  file: File
}

export default function DownloadButton({
  pdfFile,
  payload,
  disabled,
  onEditSignature,
}: DownloadButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState<ReadyState | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [canShareFiles, setCanShareFiles] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  const urlRef = useRef<string | null>(null)
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

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
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const iOSLike = /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
    setIsIOS(iOSLike)
  }, [])

  function triggerDownload(state: ReadyState) {
    if (isIOS) {
      // iOS Safari ignores the `download` attribute on blob URLs and opens
      // the PDF inline. Open in a new tab instead — Safari shows its native
      // share/save toolbar so the user can tap "Save to Files."
      const w = window.open(state.url, '_blank')
      if (!w) {
        // Popup blocked — fall back to the <a> trick anyway
        const a = document.createElement('a')
        a.href = state.url
        a.download = state.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } else {
      const a = document.createElement('a')
      a.href = state.url
      a.download = state.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    setSavedAt(new Date())
  }

  async function handleApplyAndDownload() {
    if (!payload) return
    setLoading(true)
    setError(null)
    setSavedAt(null)
    if (ready) {
      URL.revokeObjectURL(ready.url)
      urlRef.current = null
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
      if (payload.textAnnotations && payload.textAnnotations.length > 0) {
        formData.append('textAnnotations', JSON.stringify(payload.textAnnotations))
      }
      if (payload.filledTextFields && payload.filledTextFields.length > 0) {
        formData.append('filledTextFields', JSON.stringify(payload.filledTextFields))
      }

      const res = await fetch('/api/process', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Download failed')
      }

      const blob = await res.blob()
      const filename = (pdfFile.name.replace(/\.pdf$/i, '') || 'signed') + '-signed.pdf'
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      const file = new File([blob], filename, { type: 'application/pdf' })
      const state = { url, filename, file }
      setReady(state)

      if (isIOS && canShareFiles) {
        // On iOS, don't auto-fire; let the user tap "Save to device" which
        // opens the native share sheet (most reliable on iOS).
      } else {
        triggerDownload(state)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!ready) return
    const { filename, file } = ready
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename })
        setSavedAt(new Date())
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    triggerDownload(ready)
  }

  if (ready) {
    const time = savedAt?.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    const showSaveFirst = isIOS && canShareFiles && !savedAt
    return (
      <div className="rounded-2xl border border-accent-600/30 bg-accent-50/60 p-5">
        <div className="flex items-start gap-4">
          <span className="animate-check-pop flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white shadow-sm">
            <Check className="h-6 w-6 stroke-[2.5]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-primary">
              {savedAt ? 'Your document is signed' : 'Your signed document is ready'}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-secondary">{ready.filename}</p>
            <p className="mt-1 text-xs text-muted">
              {savedAt
                ? `Downloaded ${time}`
                : isIOS
                  ? 'Tap Save to keep it on your device.'
                  : 'Your download should start automatically.'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {showSaveFirst ? (
            <button
              type="button"
              onClick={() => void handleShare()}
              className="focus-accent inline-flex items-center justify-center gap-2 rounded-full bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Save to device
            </button>
          ) : (
            <button
              type="button"
              onClick={() => triggerDownload(ready)}
              className="focus-accent inline-flex items-center justify-center gap-2 rounded-full bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              <Download className="h-4 w-4" aria-hidden />
              {savedAt ? 'Download again' : 'Download'}
            </button>
          )}
          {/* On iOS, always show share as secondary action even after saving */}
          {canShareFiles && !showSaveFirst && (
            <button
              type="button"
              onClick={() => void handleShare()}
              className="focus-accent inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-border-strong"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share
            </button>
          )}
          {/* On iOS without share support, show "Open in new tab" as fallback */}
          {isIOS && !canShareFiles && (
            <button
              type="button"
              onClick={() => triggerDownload(ready)}
              className="focus-accent inline-flex items-center justify-center gap-2 rounded-full bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              <Download className="h-4 w-4" aria-hidden />
              Open &amp; save
            </button>
          )}
          {onEditSignature && (
            <button
              type="button"
              onClick={onEditSignature}
              className="focus-accent inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-secondary transition-colors hover:text-primary"
            >
              <PenLine className="h-3.5 w-3.5" aria-hidden />
              Change signature
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || !payload || loading}
        onClick={() => void handleApplyAndDownload()}
        className="focus-accent inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-7 py-3.5 text-sm font-semibold text-[var(--btn-primary-fg)] transition-colors hover:bg-[var(--btn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <Download className="h-4 w-4" aria-hidden />
        {loading ? 'Applying signature…' : 'Apply signature & download'}
      </button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
