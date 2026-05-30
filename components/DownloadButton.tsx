'use client'

import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import type { ProcessPayload } from '@/types'

type DownloadButtonProps = {
  pdfFile: File
  payload: ProcessPayload | null
  disabled?: boolean
}

export default function DownloadButton({ pdfFile, payload, disabled }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)

  async function handleDownload() {
    if (!payload) return
    setLoading(true)
    setError(null)

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

      const res = await fetch('/api/process', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Download failed')
      }

      const blob = await res.blob()
      const filename =
        (pdfFile.name.replace(/\.pdf$/i, '') || 'signed') + '-signed.pdf'

      const file = new File([blob], filename, { type: 'application/pdf' })

      // 1. Try Web Share API (works on mobile with HTTPS)
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file], title: filename })
          return
        } catch (shareErr) {
          if (shareErr instanceof DOMException && shareErr.name === 'AbortError') return
        }
      }

      // 2. Anchor download — works on desktop, some Android browsers
      const url = URL.createObjectURL(blob)
      const link = linkRef.current
      if (link) {
        link.href = url
        link.download = filename
        link.click()
      }

      // 3. Fallback: open in new tab (iOS Safari HTTP, older browsers)
      // iOS ignores the download attr on blob URLs, so opening in a new tab
      // lets the user use the native share/save from the PDF viewer.
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      if (isMobile) {
        window.open(url, '_blank')
      }

      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
      <a
        ref={linkRef}
        aria-hidden
        tabIndex={-1}
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      />
      <button
        type="button"
        disabled={disabled || !payload || loading}
        onClick={() => void handleDownload()}
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
