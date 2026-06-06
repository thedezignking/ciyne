'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Check, PenLine, Share2, ExternalLink } from 'lucide-react'
import type { ProcessPayload } from '@/types'
import { createCleanPdf } from '@/lib/createCleanPdf'

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
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const iOSLike = /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
    setIsIOS(iOSLike)

    try {
      const probe = new File([new Blob(['test'])], 'probe.pdf', { type: 'application/pdf' })
      setCanShareFiles(
        typeof navigator !== 'undefined' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [probe] })
      )
    } catch {
      setCanShareFiles(false)
    }
  }, [])

  // Desktop/Android: programmatic <a download> works fine.
  function doAnchorDownload(state: ReadyState) {
    const a = document.createElement('a')
    a.href = state.url
    a.download = state.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setSavedAt(new Date())
  }

  // iOS: navigator.share is the most reliable way to save files.
  // Must be called from a direct user tap (user gesture required).
  async function doIOSShare() {
    if (!ready) return
    try {
      await navigator.share({ files: [ready.file], title: ready.filename })
      setSavedAt(new Date())
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Share failed — fall back to opening in a new tab
      doIOSOpenTab()
    }
  }

  // iOS fallback: open the blob URL in a new tab. Safari shows its native
  // toolbar with a share/save button the user can tap.
  function doIOSOpenTab() {
    if (!ready) return
    window.open(ready.url, '_blank')
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
      // If text fields were filled, create a brand new PDF first:
      // server blanks placeholders from content streams → client renders
      // cleaned pages → draws replacement text → builds new image-based PDF.
      let finalPdf = pdfFile
      if (payload.filledTextFields && payload.filledTextFields.length > 0) {
        finalPdf = await createCleanPdf(pdfFile, payload.filledTextFields)
      }

      const formData = new FormData()
      formData.append('originalPDF', finalPdf)
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

      // On iOS, NEVER auto-fire — async fetch breaks the user gesture chain,
      // so window.open / <a>.click would be blocked. Instead, show the "ready"
      // card and let the user tap a button (a fresh user gesture).
      if (!isIOS) {
        doAnchorDownload(state)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ---- Ready card ----
  if (ready) {
    const time = savedAt?.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

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
                ? `Saved ${time}`
                : isIOS
                  ? 'Tap below to save it to your device.'
                  : 'Your download should start automatically.'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {isIOS ? (
            <>
              {/* iOS primary: share sheet (most reliable save method) */}
              {canShareFiles && (
                <button
                  type="button"
                  onClick={() => void doIOSShare()}
                  className="focus-accent inline-flex items-center justify-center gap-2 rounded-full bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                >
                  <Share2 className="h-4 w-4" aria-hidden />
                  Save to device
                </button>
              )}
              {/* iOS secondary/fallback: open in new tab (Safari shows toolbar) */}
              <button
                type="button"
                onClick={doIOSOpenTab}
                className={`focus-accent inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  canShareFiles
                    ? 'border border-border bg-surface text-primary hover:border-border-strong'
                    : 'bg-accent-600 text-white hover:opacity-90'
                }`}
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Open PDF
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => doAnchorDownload(ready)}
                className="focus-accent inline-flex items-center justify-center gap-2 rounded-full bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              >
                <Download className="h-4 w-4" aria-hidden />
                {savedAt ? 'Download again' : 'Download'}
              </button>
              {canShareFiles && (
                <button
                  type="button"
                  onClick={() => void doIOSShare()}
                  className="focus-accent inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-border-strong"
                >
                  <Share2 className="h-4 w-4" aria-hidden />
                  Share
                </button>
              )}
            </>
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
        {loading ? 'Creating your PDF…' : 'Apply signature & download'}
      </button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
