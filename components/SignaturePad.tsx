'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, Check } from 'lucide-react'
import { trimToDataUrl } from '@/lib/signatureCanvas'

type SignaturePadProps = {
  onSignature: (dataUrl: string) => void
}

const INK = '#1a2332'

/**
 * Draw-your-own signature. Pointer-based (mouse, touch, stylus), high-DPI aware,
 * transparent background, exports a tightly cropped transparent PNG.
 */
export default function SignaturePad({ onSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)

  // Size the canvas backing store to its display box * devicePixelRatio.
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.8
  }, [])

  useEffect(() => {
    setupCanvas()
    const onResize = () => {
      // Preserve current drawing across resizes.
      const canvas = canvasRef.current
      if (!canvas) return
      const snapshot = canvas.toDataURL()
      setupCanvas()
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const img = new Image()
      img.onload = () => {
        const rect = canvas.getBoundingClientRect()
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
      img.src = snapshot
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setupCanvas])

  const pos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent) => {
    e.preventDefault()
    drawing.current = true
    last.current = pos(e)
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !last.current) return
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    if (!hasInk) setHasInk(true)
  }

  const end = (e: React.PointerEvent) => {
    drawing.current = false
    last.current = null
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* pointer already released */
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  const use = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = trimToDataUrl(canvas)
    if (dataUrl) onSignature(dataUrl)
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl border border-border bg-surface">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="block h-48 w-full cursor-crosshair touch-none rounded-2xl"
          aria-label="Draw your signature"
        />
        {/* Baseline + hint, hidden once drawing starts */}
        <div className="pointer-events-none absolute inset-x-8 bottom-12 border-b border-dashed border-border" />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">
            Draw your signature here
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={clear}
          disabled={!hasInk}
          className="focus-accent inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-secondary transition-colors hover:text-primary disabled:opacity-40"
        >
          <Eraser className="h-4 w-4" aria-hidden />
          Clear
        </button>
        <button
          type="button"
          onClick={use}
          disabled={!hasInk}
          className="focus-accent group inline-flex items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--btn-primary-fg)] transition-colors hover:bg-[var(--btn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" aria-hidden />
          Use this signature
        </button>
      </div>
    </div>
  )
}
