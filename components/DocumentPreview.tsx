'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { renderPdfPage } from '@/lib/renderPdfPage'

type DocumentPreviewProps = {
  pdfFile: File
  pageIndex: number
  pageCount: number | null
  onPageCountKnown?: (count: number) => void
  onReady?: () => void
  overlay?: (width: number, height: number) => React.ReactNode
  onPageChange?: (page: number) => void
}

export default function DocumentPreview({
  pdfFile,
  pageIndex,
  pageCount,
  onPageCountKnown,
  onReady,
  overlay,
  onPageChange,
}: DocumentPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    renderPdfPage(pdfFile, pageIndex)
      .then(({ canvas, pageCount: count }) => {
        if (cancelled) return
        const container = containerRef.current
        if (!container) return

        container.innerHTML = ''
        canvas.style.width = '100%'
        canvas.style.height = 'auto'
        canvas.style.display = 'block'
        container.appendChild(canvas)
        canvasRef.current = canvas

        onPageCountKnown?.(count)
        setLoading(false)
        onReady?.()
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to render PDF')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [pdfFile, pageIndex, onReady, onPageCountKnown])

  useEffect(() => {
    if (loading) return
    const canvas = canvasRef.current
    if (!canvas) return

    const measure = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [loading])

  const canPrev = pageIndex > 0
  const canNext = pageCount !== null && pageIndex < pageCount - 1
  const showNav = pageCount !== null && pageCount > 1

  return (
    <div
      className="overflow-hidden rounded-2xl border border-black/5 bg-surface"
      style={{ boxShadow: 'var(--shadow-doc)' }}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-page/60 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-1 flex-1 truncate text-[11px] font-medium text-muted">
          {pdfFile.name}
        </span>
        {showNav && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => onPageChange?.(pageIndex - 1)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-secondary transition-colors hover:bg-black/5 disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[3.5rem] text-center text-[11px] font-semibold tabular-nums text-secondary">
              {pageIndex + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => onPageChange?.(pageIndex + 1)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-secondary transition-colors hover:bg-black/5 disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-page)] p-3 sm:p-4">
        {loading && (
          <p className="py-12 text-center text-sm text-secondary">Rendering document…</p>
        )}
        {error && (
          <p className="py-12 text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="relative">
          <div ref={containerRef} className="overflow-hidden rounded-lg shadow-sm" />
          {dimensions && overlay && (
            <div className="absolute inset-0">
              {overlay(dimensions.width, dimensions.height)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
