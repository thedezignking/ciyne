'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { renderPdfPage } from '@/lib/renderPdfPage'

type DocumentPreviewProps = {
  pdfFile: File
  onReady: (canvas: HTMLCanvasElement, width: number, height: number) => void
  overlay?: (width: number, height: number) => ReactNode
}

export default function DocumentPreview({
  pdfFile,
  onReady,
  overlay,
}: DocumentPreviewProps) {
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setDims(null)
      try {
        const { canvas, width, height } = await renderPdfPage(pdfFile, 0)
        if (cancelled) return
        const host = canvasHostRef.current
        if (!host) return
        host.replaceChildren(canvas)
        canvas.className = 'block max-w-full h-auto'
        setDims({ width, height })
        onReady(canvas, width, height)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to render PDF')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [pdfFile, onReady])

  return (
    <div className="overflow-auto rounded-lg border border-border bg-muted/30 p-4">
      {loading && <p className="py-12 text-center text-sm text-secondary">Loading document…</p>}
      {error && (
        <p className="py-12 text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-center">
        <div className="relative inline-block leading-none">
          <div ref={canvasHostRef} />
          {dims && overlay?.(dims.width, dims.height)}
        </div>
      </div>
    </div>
  )
}
