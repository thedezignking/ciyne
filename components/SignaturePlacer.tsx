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
    pointerId: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const emit = useCallback(
    (r: Rect) => {
      onPlacementChange({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        canvasWidth,
        canvasHeight,
      })
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
      emit(initial)
    }
    img.src = signatureDataUrl
  }, [signatureDataUrl, canvasWidth, canvasHeight, emit])

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current
      if (!d) return
      e.preventDefault()
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY

      setRect((prev) => {
        if (!prev) return prev
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
          next = {
            ...d.startRect,
            width,
            height: Math.min(height, canvasHeight - d.startRect.y),
          }
        }
        emit(next)
        return next
      })
    }

    function onUp(e: PointerEvent) {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      const el = containerRef.current
      if (el) {
        try { el.releasePointerCapture(e.pointerId) } catch { /* ok */ }
      }
    }

    const el = containerRef.current
    if (!el) return
    el.addEventListener('pointermove', onMove, { passive: false })
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [canvasWidth, canvasHeight, emit])

  const startDrag = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    if (!rect) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startRect: rect,
      pointerId: e.pointerId,
    }
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  if (!rect) return null

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-0 touch-none"
      style={{ width: canvasWidth, height: canvasHeight }}
      aria-label="Drag and resize your signature"
    >
      <div
        className="absolute cursor-move select-none"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
        onPointerDown={(e) => startDrag(e, 'move')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signatureDataUrl}
          alt=""
          draggable={false}
          className="h-full w-full object-contain pointer-events-none"
        />
        <div
          role="presentation"
          className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 cursor-se-resize items-center justify-center rounded-full border-2 border-accent-500 bg-white shadow-sm sm:-bottom-0 sm:-right-0 sm:h-4 sm:w-4 sm:rounded-sm"
          onPointerDown={(e) => startDrag(e, 'resize')}
        >
          <span className="block h-2 w-2 rounded-sm bg-accent-500 sm:hidden" />
        </div>
      </div>
    </div>
  )
}
