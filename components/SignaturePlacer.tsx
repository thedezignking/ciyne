'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SignaturePlacement } from '@/types'

type SignaturePlacerProps = {
  signatureDataUrl: string
  canvasWidth: number
  canvasHeight: number
  onPlacementChange: (placement: Omit<SignaturePlacement, 'pageIndex'>) => void
}

type Rect = { x: number; y: number; width: number; height: number }

function clientXY(e: MouseEvent | TouchEvent): { cx: number; cy: number } | null {
  if ('touches' in e) {
    const t = e.touches[0] ?? e.changedTouches[0]
    if (!t) return null
    return { cx: t.clientX, cy: t.clientY }
  }
  return { cx: e.clientX, cy: e.clientY }
}

export default function SignaturePlacer({
  signatureDataUrl,
  canvasWidth,
  canvasHeight,
  onPlacementChange,
}: SignaturePlacerProps) {
  const [rect, setRect] = useState<Rect | null>(null)
  const dragRef = useRef<{
    mode: 'move' | 'resize'
    startX: number
    startY: number
    startRect: Rect
  } | null>(null)
  const rectRef = useRef<Rect | null>(null)

  const emit = useCallback(
    (r: Rect) => {
      onPlacementChange({ x: r.x, y: r.y, width: r.width, height: r.height, canvasWidth, canvasHeight })
    },
    [canvasWidth, canvasHeight, onPlacementChange]
  )

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const maxW = canvasWidth * 0.4
      const scale = maxW / img.naturalWidth
      const width = img.naturalWidth * scale
      const height = img.naturalHeight * scale
      const initial: Rect = {
        x: canvasWidth * 0.1,
        y: canvasHeight * 0.65,
        width,
        height,
      }
      setRect(initial)
      rectRef.current = initial
      emit(initial)
    }
    img.src = signatureDataUrl
  }, [signatureDataUrl, canvasWidth, canvasHeight, emit])

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      const d = dragRef.current
      if (!d) return
      e.preventDefault()
      const pt = clientXY(e)
      if (!pt) return
      const dx = pt.cx - d.startX
      const dy = pt.cy - d.startY

      let next: Rect
      if (d.mode === 'move') {
        next = {
          ...d.startRect,
          x: Math.max(0, Math.min(canvasWidth - d.startRect.width, d.startRect.x + dx)),
          y: Math.max(0, Math.min(canvasHeight - d.startRect.height, d.startRect.y + dy)),
        }
      } else {
        const width = Math.max(40, Math.min(canvasWidth - d.startRect.x, d.startRect.width + dx))
        const aspect = d.startRect.height / d.startRect.width
        const height = width * aspect
        next = { ...d.startRect, width, height: Math.min(height, canvasHeight - d.startRect.y) }
      }
      setRect(next)
      rectRef.current = next
      emit(next)
    }

    function onEnd() {
      dragRef.current = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [canvasWidth, canvasHeight, emit])

  const startDrag = useCallback(
    (mode: 'move' | 'resize', e: React.MouseEvent | React.TouchEvent) => {
      const r = rectRef.current
      if (!r) return
      e.preventDefault()
      e.stopPropagation()
      const pt = clientXY(e.nativeEvent)
      if (!pt) return
      dragRef.current = { mode, startX: pt.cx, startY: pt.cy, startRect: r }
    },
    []
  )

  if (!rect) return null

  return (
    <div
      className="absolute left-0 top-0"
      style={{ width: canvasWidth, height: canvasHeight, touchAction: 'none' }}
      aria-label="Drag and resize your signature"
    >
      {/* Move target */}
      <div
        className="absolute cursor-move select-none"
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, touchAction: 'none' }}
        onMouseDown={(e) => startDrag('move', e)}
        onTouchStart={(e) => startDrag('move', e)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signatureDataUrl}
          alt=""
          draggable={false}
          className="h-full w-full object-contain pointer-events-none select-none"
        />

        {/* Resize handle */}
        <div
          role="presentation"
          className="absolute -bottom-3 -right-3 flex h-8 w-8 cursor-se-resize items-center justify-center rounded-full border-2 border-accent-600 bg-white shadow-sm"
          style={{ touchAction: 'none' }}
          onMouseDown={(e) => { e.stopPropagation(); startDrag('resize', e) }}
          onTouchStart={(e) => { e.stopPropagation(); startDrag('resize', e) }}
        >
          <span className="block h-2.5 w-2.5 rounded-sm bg-accent-600" />
        </div>
      </div>
    </div>
  )
}
