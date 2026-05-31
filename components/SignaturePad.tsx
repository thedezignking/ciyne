'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, Check } from 'lucide-react'
import { trimToDataUrl } from '@/lib/signatureCanvas'

type SignaturePadProps = {
  onSignature: (dataUrl: string) => void
}

const COLORS = [
  { id: 'navy', value: '#2b3a67' },
  { id: 'black', value: '#1a1a1e' },
] as const

// Base pen widths; the thickness slider scales these by 0.6×–1.8×.
const BASE_MIN = 2.0
const BASE_MAX = 5.5
const VELOCITY_FACTOR = 0.35
const WIDTH_SMOOTHING = 0.4

type Pt = { x: number; y: number; t: number }

function midpoint(a: Pt, b: Pt) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * Draw-your-own signature with a real pen feel: stroke width responds to
 * stylus pressure when available, otherwise to drawing velocity (fast = thin,
 * slow = thick), with quadratic-curve smoothing between points. Pen color and
 * thickness are adjustable live from the toolbar. Exports a tightly cropped
 * transparent PNG.
 */
export default function SignaturePad({ onSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const points = useRef<Pt[]>([])
  const lastMid = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)

  const [color, setColor] = useState<string>(COLORS[0].value)
  // 0.6–1.8 thickness multiplier; 1.0 is the default pen weight.
  const [thickness, setThickness] = useState(1)

  // Refs so the live draw handlers always read the latest values.
  const colorRef = useRef(color)
  const thicknessRef = useRef(thickness)
  const width = useRef(BASE_MAX * 0.7)
  colorRef.current = color
  thicknessRef.current = thickness

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

  useEffect(() => {
    setupCanvas()
    const onResize = () => {
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

  const pos = (e: React.PointerEvent): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() }
  }

  // Target stroke width from stylus pressure (preferred) or velocity, scaled
  // by the chosen thickness.
  const targetWidth = (e: React.PointerEvent, from: Pt, to: Pt): number => {
    const k = thicknessRef.current
    const min = BASE_MIN * k
    const max = BASE_MAX * k
    if (e.pointerType === 'pen' && e.pressure > 0 && e.pressure !== 0.5) {
      return min + (max - min) * e.pressure
    }
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    const dt = Math.max(1, to.t - from.t)
    const velocity = dist / dt // px per ms
    const w = max - velocity * (max - min) * VELOCITY_FACTOR
    return Math.max(min, Math.min(max, w))
  }

  const start = (e: React.PointerEvent) => {
    e.preventDefault()
    drawing.current = true
    const p = pos(e)
    points.current = [p]
    lastMid.current = { x: p.x, y: p.y }
    width.current = BASE_MAX * thicknessRef.current * 0.65
    canvasRef.current?.setPointerCapture(e.pointerId)

    // Seed dot so a tap leaves a mark.
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
    drawing.current = false
    points.current = []
    lastMid.current = null
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
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
        <div className="pointer-events-none absolute inset-x-8 bottom-12 border-b border-dashed border-border" />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">
            Draw your signature here
          </span>
        )}
      </div>

      {/* Toolbar: clear · ink color · thickness · use */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={clear}
          disabled={!hasInk}
          className="focus-accent inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-secondary transition-colors hover:text-primary disabled:opacity-40"
        >
          <Eraser className="h-4 w-4" aria-hidden />
          Clear
        </button>

        {/* Ink color */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => {
            const active = color === c.value
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.value)}
                aria-pressed={active}
                aria-label={`${c.id} ink`}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform ${
                  active ? 'border-accent-600 scale-110' : 'border-border hover:border-border-strong'
                }`}
              >
                <span className="block h-4 w-4 rounded-full" style={{ background: c.value }} aria-hidden />
              </button>
            )
          })}
        </div>

        {/* Thickness */}
        <label className="flex items-center gap-2 text-xs font-medium text-secondary">
          <span className="hidden sm:inline">Thickness</span>
          <input
            type="range"
            min={0.6}
            max={1.8}
            step={0.05}
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            className="h-1.5 w-20 cursor-pointer accent-accent-600 sm:w-28"
            aria-label="Pen thickness"
          />
        </label>

        <button
          type="button"
          onClick={use}
          disabled={!hasInk}
          className="focus-accent group ml-auto inline-flex items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--btn-primary-fg)] transition-colors hover:bg-[var(--btn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" aria-hidden />
          Use this signature
        </button>
      </div>
    </div>
  )
}
