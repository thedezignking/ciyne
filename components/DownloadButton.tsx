'use client'

import { useState } from 'react'
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
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        pdfFile.name.replace(/\.pdf$/i, '') + '-signed.pdf' || 'signed.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || !payload || loading}
        onClick={() => void handleDownload()}
        className="focus-accent inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--btn-primary-bg)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1a2332] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
