'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { trimToDataUrl } from '@/lib/signatureCanvas'

type SignaturePadProps = {
  /** Pen color for live feedback while drawing. */
  color: string
  /** Restore a previously drawn canvas (full-size snapshot). */
  initialImage: string | null
  /** Emits (fullSnapshot, trimmed) on every change; nulls when cleared. */
  onChange: (full: string | null, trimmed: string | null) => void
}

const BASE_MIN = 2.0
const BASE_MAX = 5.5
const VELOCITY_FACTOR = 0.35
const WIDTH_SMOOTHING = 0.4

type Pt = { x: number; y: number; t: number }

function midpoint(a: Pt, b: Pt) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * Draw-your-own signature with a real pen feel (velocity-driven width and
 * quadratic smoothing). Strokes are emitted live to the parent, which applies
 * the chosen ink color and weight. The canvas restores from `initialImage` so
 * the drawing survives step navigation.
 */
export default function SignaturePad({ color, initialImage, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const points = useRef<Pt[]>([])
  const lastMid = useRef<{ x: number; y: number } | null>(null)
  const width = useRef(BASE_MAX * 0.7)
  const [hasInk, setHasInk] = useState(Boolean(initialImage))
  const colorRef = useRef(color)
  colorRef.current = color

  const paintImage = useCallback((src: string) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const img = new Image()
    img.onload = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.drawImage(img, 0, 0, rect.width, rect.height)
    }
    img.src = src
  }, [])

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
  }, [])

  // Initial mount: size canvas and restore any saved drawing.
  useEffect(() => {
    setupCanvas()
    if (initialImage) paintImage(initialImage)
    const onResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const snapshot = canvas.toDataURL()
      setupCanvas()
      paintImage(snapshot)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupCanvas, paintImage])

  const pos = (e: React.PointerEvent): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() }
  }

  const targetWidth = (e: React.PointerEvent, from: Pt, to: Pt): number => {
    if (e.pointerType === 'pen' && e.pressure > 0 && e.pressure !== 0.5) {
      return BASE_MIN + (BASE_MAX - BASE_MIN) * e.pressure
    }
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    const dt = Math.max(1, to.t - from.t)
    const velocity = dist / dt
    const w = BASE_MAX - velocity * (BASE_MAX - BASE_MIN) * VELOCITY_FACTOR
    return Math.max(BASE_MIN, Math.min(BASE_MAX, w))
  }

  const emit = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL(), trimToDataUrl(canvas))
  }

  const start = (e: React.PointerEvent) => {
    e.preventDefault()
    drawing.current = true
    const p = pos(e)
    points.current = [p]
    lastMid.current = { x: p.x, y: p.y }
    width.current = BASE_MAX * 0.65
    canvasRef.current?.setPointerCapture(e.pointerId)

    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.fillStyle = colorRef.current
      ctx.beginPath()
      ctx.arc(p.x, p.y, width.current / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const prev = points.current[points.current.length - 1]
    const p = pos(e)
    if (!prev) {
      points.current.push(p)
      return
    }

    const target = targetWidth(e, prev, p)
    width.current = width.current + (target - width.current) * WIDTH_SMOOTHING

    const mid = midpoint(prev, p)
    ctx.strokeStyle = colorRef.current
    ctx.beginPath()
    ctx.lineWidth = width.current
    if (lastMid.current) {
      ctx.moveTo(lastMid.current.x, lastMid.current.y)
      ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y)
    } else {
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(mid.x, mid.y)
    }
    ctx.stroke()

    lastMid.current = mid
    points.current.push(p)
    if (!hasInk) setHasInk(true)
  }

  const end = (e: React.PointerEvent) => {
    if (!drawing.current) return
    drawing.current = false
    points.current = []
    lastMid.current = null
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    emit()
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange(null, null)
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
        <div className="pointer-events-none absolute inset-x-8 bottom-12 border-b border-dashed border-border" />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">
            Draw your signature here
          </span>
        )}
      </div>

      <div className="flex items-center">
        <button
          type="button"
          onClick={clear}
          disabled={!hasInk}
          className="focus-accent inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-secondary transition-colors hover:text-primary disabled:opacity-40"
        >
          <Eraser className="h-4 w-4" aria-hidden />
          Clear
        </button>
      </div>
    </div>
  )
}
