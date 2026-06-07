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
  blob: Blob
  file: File | null
}

function detectPlatform() {
  if (typeof navigator === 'undefined') return { isIOS: false, isInApp: false, isMobile: false }
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  const isInApp = /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|Snapchat|Pinterest/i.test(ua)
  const isMobile = isIOS || /Android/i.test(ua)
  return { isIOS, isInApp, isMobile }
}

function tryCreateFile(blob: Blob, name: string): File | null {
  try {
    return new File([blob], name, { type: 'application/pdf', lastModified: Date.now() })
  } catch {
    return null
  }
}

function tryCanShareFiles(): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
    const probe = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'test.pdf', { type: 'application/pdf' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read PDF'))
    reader.readAsDataURL(blob)
  })
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
  const [platform, setPlatform] = useState({ isIOS: false, isInApp: false, isMobile: false })
  const [canShare, setCanShare] = useState(false)

  const urlRef = useRef<string | null>(null)
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  useEffect(() => {
    setPlatform(detectPlatform())
    setCanShare(tryCanShareFiles())
  }, [])

  const { isIOS, isInApp, isMobile } = platform

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
      let finalPdf = pdfFile
      // Skip createCleanPdf on iOS/mobile — canvas rendering uses too much memory
      if (!isMobile && payload.filledTextFields && payload.filledTextFields.length > 0) {
        try {
          finalPdf = await createCleanPdf(pdfFile, payload.filledTextFields)
        } catch (cleanErr) {
          console.error('createCleanPdf failed:', cleanErr)
        }
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
      if (isMobile && payload.filledTextFields && payload.filledTextFields.length > 0) {
        formData.append('filledTextFields', JSON.stringify(payload.filledTextFields))
      }

      let res: Response
      try {
        res = await fetch('/api/process', { method: 'POST', body: formData })
      } catch (fetchErr) {
        throw new Error(
          `Network error: ${fetchErr instanceof Error ? fetchErr.message : 'Could not reach server'}`
        )
      }

      if (!res.ok) {
        let detail = ''
        try {
          const text = await res.text()
          const data = JSON.parse(text) as { error?: string }
          detail = data.error || text.slice(0, 200)
        } catch {
          detail = `HTTP ${res.status}`
        }
        throw new Error(detail || `Server error (${res.status})`)
      }

      const blob = await res.blob()
      if (!blob || blob.size === 0) {
        throw new Error('Server returned an empty PDF')
      }

      const filename = (pdfFile.name.replace(/\.pdf$/i, '') || 'signed') + '-signed.pdf'
      const file = tryCreateFile(blob, filename)

      if (isIOS || isInApp) {
        // On iOS, blob URLs in new tabs are unreliable. Convert to data URL
        // which Safari handles natively in its PDF viewer.
        let url: string
        try {
          url = await blobToDataUrl(blob)
        } catch {
          url = URL.createObjectURL(blob)
          urlRef.current = url
        }
        setReady({ url, filename, blob, file })
      } else {
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        const state: ReadyState = { url, filename, blob, file }
        setReady(state)

        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setSavedAt(new Date())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!ready) return
    const file = ready.file ?? tryCreateFile(ready.blob, ready.filename)
    if (!file) {
      // File constructor failed — fall back to link
      setSavedAt(new Date())
      return
    }
    try {
      await navigator.share({ files: [file], title: ready.filename })
      setSavedAt(new Date())
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Share threw — mark as attempted so user sees the link fallback
      setError('Could not open share sheet. Use the link below to open your PDF.')
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
            {savedAt ? (
              <p className="mt-1 text-xs text-muted">Saved {time}</p>
            ) : isIOS || isInApp ? (
              <p className="mt-1 text-xs text-muted">Tap below to save it to your device.</p>
            ) : (
              <p className="mt-1 text-xs text-muted">Your download should start automatically.</p>
            )}
          </div>
        </div>

        {/* In-app browser warning */}
        {isInApp && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            For the best experience, open this page in Safari or Chrome. Tap the
            &ldquo;⋯&rdquo; menu and select &ldquo;Open in browser.&rdquo;
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {isIOS || isInApp ? (
            <>
              {canShare && (
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="focus-accent inline-flex items-center justify-center gap-2 rounded-full bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
                >
                  <Share2 className="h-4 w-4" aria-hidden />
                  Save to device
                </button>
              )}
              {/* Open PDF in same tab — iOS Safari renders PDFs inline with
                  its native toolbar (share, save to Files, etc). Using
                  target=_blank with blob/data URLs fails on iOS. */}
              <a
                href={ready.url}
                rel="noopener noreferrer"
                onClick={() => setSavedAt(new Date())}
                className={`focus-accent inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  canShare
                    ? 'border border-border bg-surface text-primary hover:border-border-strong'
                    : 'bg-accent-600 text-white hover:opacity-90'
                }`}
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Open PDF
              </a>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = ready.url
                  a.download = ready.filename
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  setSavedAt(new Date())
                }}
                className="focus-accent inline-flex items-center justify-center gap-2 rounded-full bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              >
                <Download className="h-4 w-4" aria-hidden />
                {savedAt ? 'Download again' : 'Download'}
              </button>
              {canShare && (
                <button
                  type="button"
                  onClick={() => void handleShare()}
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

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>
        )}
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
