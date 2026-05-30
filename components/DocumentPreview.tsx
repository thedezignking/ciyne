'use client'

import { useEffect, useRef, useState } from 'react'
import { renderPdfPage } from '@/lib/renderPdfPage'

type DocumentPreviewProps = {
  pdfFile: File
  onReady?: () => void
  overlay?: (width: number, height: number) => React.ReactNode
}

export default function DocumentPreview({ pdfFile, onReady, overlay }: DocumentPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // Displayed (CSS-pixel) size of the rendered canvas — the coordinate space the
  // signature overlay must use so what the user places matches what gets embedded.
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    renderPdfPage(pdfFile, 0)
      .then(({ canvas }) => {
        if (cancelled) return
        const container = containerRef.current
        if (!container) return

        container.innerHTML = ''
        canvas.style.width = '100%'
        canvas.style.height = 'auto'
        canvas.style.display = 'block'
        container.appendChild(canvas)
        canvasRef.current = canvas

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
  }, [pdfFile, onReady])

  // Track the canvas's on-screen size and keep it in sync on resize.
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

  return (
    <div
      className="overflow-hidden rounded-2xl border border-black/5 bg-surface"
      style={{ boxShadow: 'var(--shadow-doc)' }}
    >
      {/* Window chrome — echoes the hero document cards */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-page/60 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-1 truncate text-[11px] font-medium text-muted">{pdfFile.name}</span>
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
            <div className="pointer-events-none absolute inset-0">
              {overlay(dimensions.width, dimensions.height)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
