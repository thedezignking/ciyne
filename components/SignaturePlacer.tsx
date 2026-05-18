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
  } | null>(null)

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
    function onMove(e: MouseEvent) {
      const d = dragRef.current
      if (!d) return
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

    function onUp() {
      dragRef.current = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [canvasWidth, canvasHeight, emit])

  if (!rect) return null

  return (
    <div
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
        onMouseDown={(e) => {
          e.preventDefault()
          dragRef.current = {
            mode: 'move',
            startX: e.clientX,
            startY: e.clientY,
            startRect: rect,
          }
        }}
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
          className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded-sm border-2 border-accent-500 bg-white"
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            dragRef.current = {
              mode: 'resize',
              startX: e.clientX,
              startY: e.clientY,
              startRect: rect,
            }
          }}
        />
      </div>
    </div>
  )
}
