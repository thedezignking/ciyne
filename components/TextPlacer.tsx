'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import type { TextAnnotation } from '@/types'

type TextPlacerProps = {
  annotations: TextAnnotation[]
  canvasWidth: number
  canvasHeight: number
  onAnnotationsChange: (annotations: TextAnnotation[]) => void
  /** When true, clicking the overlay creates a new text annotation. */
  active: boolean
}

function clientXY(e: MouseEvent | TouchEvent): { cx: number; cy: number } | null {
  if ('touches' in e) {
    const t = e.touches[0] ?? e.changedTouches[0]
    if (!t) return null
    return { cx: t.clientX, cy: t.clientY }
  }
  return { cx: e.clientX, cy: e.clientY }
}

const clamp = (min: number, max: number, v: number) => Math.max(min, Math.min(max, v))

const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 32
const DEFAULT_FONT_SIZE = 16

export default function TextPlacer({
  annotations,
  canvasWidth,
  canvasHeight,
  onAnnotationsChange,
  active,
}: TextPlacerProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const dragRef = useRef<{
    id: string
    startX: number
    startY: number
    startAnnX: number
    startAnnY: number
  } | null>(null)

  const updateAnnotation = useCallback(
    (id: string, patch: Partial<TextAnnotation>) => {
      onAnnotationsChange(
        annotations.map((a) => (a.id === id ? { ...a, ...patch } : a))
      )
    },
    [annotations, onAnnotationsChange]
  )

  const deleteAnnotation = useCallback(
    (id: string) => {
      onAnnotationsChange(annotations.filter((a) => a.id !== id))
      if (focusedId === id) setFocusedId(null)
    },
    [annotations, onAnnotationsChange, focusedId]
  )

  // Global mouse/touch move+end for dragging
  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      const d = dragRef.current
      if (!d) return
      e.preventDefault()
      const pt = clientXY(e)
      if (!pt) return
      const dx = pt.cx - d.startX
      const dy = pt.cy - d.startY
      const ann = annotations.find((a) => a.id === d.id)
      if (!ann) return
      const newX = clamp(0, canvasWidth - ann.width, d.startAnnX + dx)
      const newY = clamp(0, canvasHeight - ann.fontSize * 1.5, d.startAnnY + dy)
      updateAnnotation(d.id, { x: newX, y: newY })
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
  }, [annotations, canvasWidth, canvasHeight, updateAnnotation])

  const startDrag = useCallback(
    (id: string, e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const pt = clientXY(e.nativeEvent)
      if (!pt) return
      const ann = annotations.find((a) => a.id === id)
      if (!ann) return
      dragRef.current = {
        id,
        startX: pt.cx,
        startY: pt.cy,
        startAnnX: ann.x,
        startAnnY: ann.y,
      }
      setFocusedId(id)
    },
    [annotations]
  )

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!active) return
      // Only create if clicking the overlay itself, not a child
      if (e.target !== e.currentTarget) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const id = crypto.randomUUID()
      const newAnnotation: TextAnnotation = {
        id,
        pageIndex: 0, // Will be set by parent
        x,
        y,
        width: 200,
        fontSize: DEFAULT_FONT_SIZE,
        text: '',
        canvasWidth,
        canvasHeight,
      }
      onAnnotationsChange([...annotations, newAnnotation])
      setFocusedId(id)
    },
    [active, annotations, canvasWidth, canvasHeight, onAnnotationsChange]
  )

  return (
    <div
      className="absolute left-0 top-0"
      style={{
        width: canvasWidth,
        height: canvasHeight,
        touchAction: 'none',
        cursor: active ? 'text' : 'default',
        pointerEvents: active || annotations.length > 0 ? 'auto' : 'none',
      }}
      onClick={handleOverlayClick}
    >
      {annotations.map((ann) => {
        const isFocused = focusedId === ann.id
        return (
          <div
            key={ann.id}
            className="group absolute"
            style={{
              left: ann.x,
              top: ann.y,
              touchAction: 'none',
            }}
          >
            {/* Drag handle bar */}
            <div
              className="flex cursor-move items-center gap-0.5 select-none"
              style={{ touchAction: 'none' }}
              onMouseDown={(e) => startDrag(ann.id, e)}
              onTouchStart={(e) => startDrag(ann.id, e)}
            >
              <input
                type="text"
                value={ann.text}
                placeholder="Type here..."
                autoFocus={isFocused && ann.text === ''}
                onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                onFocus={() => setFocusedId(ann.id)}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="min-w-[80px] border-b border-transparent bg-transparent font-serif text-[#1a1a1e] placeholder:text-gray-400 focus:border-accent-600/50 focus:outline-none"
                style={{
                  fontSize: ann.fontSize,
                  lineHeight: 1.4,
                  width: ann.width,
                  fontFamily: 'Georgia, "Times New Roman", Times, serif',
                }}
              />
            </div>

            {/* Controls — visible on hover or focus */}
            <div
              className={`absolute -right-7 -top-1 flex flex-col gap-0.5 transition-opacity ${
                isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteAnnotation(ann.id)
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600"
                aria-label="Remove text"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Font size controls — shown when focused */}
            {isFocused && (
              <div className="absolute -bottom-7 left-0 flex items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    updateAnnotation(ann.id, {
                      fontSize: Math.max(MIN_FONT_SIZE, ann.fontSize - 2),
                    })
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-secondary transition-colors hover:bg-black/5"
                  aria-label="Decrease font size"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-[2rem] text-center text-[10px] font-semibold tabular-nums text-secondary">
                  {ann.fontSize}px
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    updateAnnotation(ann.id, {
                      fontSize: Math.min(MAX_FONT_SIZE, ann.fontSize + 2),
                    })
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-secondary transition-colors hover:bg-black/5"
                  aria-label="Increase font size"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
