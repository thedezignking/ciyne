'use client'

import { useState } from 'react'
import { Download, CheckCircle } from 'lucide-react'
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

  async function handleProcess() {
    if (!payload) return
    setLoading(true)
    setError(null)
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

  async function handleSave() {
    if (!ready) return
    const { url, filename, file } = ready

    // Web Share API — works on iOS 15.1+/Android Chrome with HTTPS.
    // This is called from a fresh user tap so gesture context is valid.
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename })
        return
      } catch (err) {
        // User dismissed share sheet — not an error
        if (err instanceof DOMException && err.name === 'AbortError') return
        // Otherwise fall through to anchor
      }
    }

    // Desktop and Android — anchor download
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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
            onClick={() => void handleSave()}
            className="focus-accent inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-600 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:opacity-90 sm:w-auto"
          >
            <CheckCircle className="h-4 w-4" aria-hidden />
            Save signed PDF
          </button>
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
