'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SignaturePlacement } from '@/types'

type NormBox = { x: number; y: number; width: number; height: number }

type SignaturePlacerProps = {
  signatureDataUrl: string
  canvasWidth: number
  canvasHeight: number
  onPlacementChange: (placement: Omit<SignaturePlacement, 'pageIndex'>) => void
  /** AI-detected target (normalized 0..1) to snap the signature onto. */
  target?: NormBox | null
  /** Bumped to re-apply the same target. */
  targetNonce?: number
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

const clamp = (min: number, max: number, v: number) => Math.max(min, Math.min(max, v))

export default function SignaturePlacer({
  signatureDataUrl,
  canvasWidth,
  canvasHeight,
  onPlacementChange,
  target,
  targetNonce,
}: SignaturePlacerProps) {
  const [rect, setRect] = useState<Rect | null>(null)
  const dragRef = useRef<{
    mode: 'move' | 'resize'
    startX: number
    startY: number
    startRect: Rect
  } | null>(null)
  const rectRef = useRef<Rect | null>(null)
  const aspectRef = useRef(0.4) // signature height / width

  const emit = useCallback(
    (r: Rect) => {
      onPlacementChange({ x: r.x, y: r.y, width: r.width, height: r.height, canvasWidth, canvasHeight })
    },
    [canvasWidth, canvasHeight, onPlacementChange]
  )

  const applyRect = useCallback(
    (r: Rect) => {
      setRect(r)
      rectRef.current = r
      emit(r)
    },
    [emit]
  )

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const aspect = img.naturalHeight / img.naturalWidth
      aspectRef.current = aspect
      const width = canvasWidth * 0.4
      const height = width * aspect
      applyRect({ x: canvasWidth * 0.1, y: canvasHeight * 0.65, width, height })
    }
    img.src = signatureDataUrl
  }, [signatureDataUrl, canvasWidth, canvasHeight, applyRect])

  // Snap onto an AI-detected field.
  useEffect(() => {
    if (!target || targetNonce === undefined) return
    const aspect = aspectRef.current
    const boxX = target.x * canvasWidth
    const boxY = target.y * canvasHeight
    const boxW = target.width * canvasWidth
    const boxH = target.height * canvasHeight

    let width = boxW * 0.96
    let height = width * aspect
    const maxH = boxH * 1.8
    if (height > maxH && maxH > 0) {
      height = maxH
      width = height / aspect
    }
    // Centered horizontally; sit on the line (bottom aligned to the field).
    const x = clamp(0, Math.max(0, canvasWidth - width), boxX + (boxW - width) / 2)
    const y = clamp(0, Math.max(0, canvasHeight - height), boxY + boxH - height)
    applyRect({ x, y, width, height })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetNonce])

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      const d = dragRef.current
      if (!d) return
      e.preventDefault()
      const pt = clientXY(e)
      if (!pt) return
      const dx = pt.cx - d.startX
      const dy = pt.cy - d.startY

      setRect((prev) => {
        if (!prev) return prev
        let next: Rect
        if (d.mode === 'move') {
          next = {
            ...d.startRect,
            x: clamp(0, canvasWidth - d.startRect.width, d.startRect.x + dx),
            y: clamp(0, canvasHeight - d.startRect.height, d.startRect.y + dy),
          }
        } else {
          const width = Math.max(40, Math.min(canvasWidth - d.startRect.x, d.startRect.width + dx))
          const aspect = d.startRect.height / d.startRect.width
          const height = width * aspect
          next = { ...d.startRect, width, height: Math.min(height, canvasHeight - d.startRect.y) }
        }
        rectRef.current = next
        emit(next)
        return next
      })
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

  const startDrag = useCallback((mode: 'move' | 'resize', e: React.MouseEvent | React.TouchEvent) => {
    const r = rectRef.current
    if (!r) return
    e.preventDefault()
    e.stopPropagation()
    const pt = clientXY(e.nativeEvent)
    if (!pt) return
    dragRef.current = { mode, startX: pt.cx, startY: pt.cy, startRect: r }
  }, [])

  if (!rect) return null

  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: canvasWidth, height: canvasHeight, touchAction: 'none' }}
      aria-label="Drag and resize your signature"
    >
      <div
        className="pointer-events-auto absolute cursor-move select-none"
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
