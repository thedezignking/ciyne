'use client'

import { useCallback, useEffect, useRef } from 'react'
import { trimToDataUrl } from '@/lib/signatureCanvas'

type SignatureTyperProps = {
  text: string
  fontId: string
  onTextChange: (text: string) => void
  onFontChange: (fontId: string) => void
  /** Emits a trimmed transparent PNG (or null when empty) on every change. */
  onRender: (trimmed: string | null) => void
  /** Refined PNG shown as live preview (after ink/weight processing). */
  previewUrl?: string | null
}

const FONTS = [
  { id: 'dancing', label: 'Flowing', cssVar: 'var(--font-dancing)', weight: 600 },
  { id: 'caveat', label: 'Casual', cssVar: 'var(--font-caveat)', weight: 600 },
  { id: 'great-vibes', label: 'Formal', cssVar: 'var(--font-great-vibes)', weight: 400 },
]

const INK = '#1a2332'

function resolveFont(cssVar: string): string {
  if (typeof window === 'undefined') return 'sans-serif'
  const prop = cssVar.replace(/^var\(/, '').replace(/\)$/, '')
  const fromBody = getComputedStyle(document.body).getPropertyValue(prop).trim()
  if (fromBody) return fromBody
  const fromRoot = getComputedStyle(document.documentElement).getPropertyValue(prop).trim()
  if (fromRoot) return fromRoot
  return 'sans-serif'
}

export default function SignatureTyper({
  text,
  fontId,
  onTextChange,
  onFontChange,
  onRender,
  previewUrl,
}: SignatureTyperProps) {
  const font = FONTS.find((f) => f.id === fontId) ?? FONTS[0]

  // Stable ref so the render effect doesn't loop on callback identity changes.
  const onRenderRef = useRef(onRender)
  onRenderRef.current = onRender

  const render = useCallback(async () => {
    const value = text.trim()
    if (!value) {
      onRenderRef.current(null)
      return
    }

    const fontPx = 200
    const pad = 60
    const family = resolveFont(font.cssVar)
    const fontSpec = `${font.weight} ${fontPx}px ${family}`

    try {
      await document.fonts.load(fontSpec, value)
    } catch {
      /* fall through */
    }

    const measureCtx = document.createElement('canvas').getContext('2d')!
    measureCtx.font = fontSpec
    const metrics = measureCtx.measureText(value)
    const textW = Math.ceil(metrics.width)

    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const logicalW = textW + pad * 2
    const logicalH = Math.ceil(fontPx * 2)

    const canvas = document.createElement('canvas')
    canvas.width = logicalW * dpr
    canvas.height = logicalH * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.font = fontSpec
    ctx.fillStyle = INK
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(value, pad, logicalH / 2)

    onRenderRef.current(trimToDataUrl(canvas, Math.round(16 * dpr)))
  }, [text, font.cssVar, font.weight])

  // Re-render live whenever the text or font changes.
  useEffect(() => {
    void render()
  }, [render])

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Type your name"
        maxLength={40}
        className="focus-accent w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-primary outline-none placeholder:text-muted"
        aria-label="Type your signature"
      />

      <div className="grid grid-cols-3 gap-2">
        {FONTS.map((f) => {
          const active = f.id === fontId
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFontChange(f.id)}
              className={`rounded-xl border px-2 py-3 text-center transition-colors ${
                active
                  ? 'border-accent-500 bg-accent-50'
                  : 'border-border bg-surface hover:border-accent-500/50'
              }`}
              aria-pressed={active}
            >
              <span
                className="block truncate text-2xl leading-none text-primary"
                style={{ fontFamily: f.cssVar, fontWeight: f.weight }}
              >
                {text.trim() || 'Signature'}
              </span>
              <span className="mt-2 block text-[11px] font-medium text-muted">{f.label}</span>
            </button>
          )
        })}
      </div>

      {previewUrl && (
        <div className="flex min-h-[72px] items-center justify-center overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(#e7eaef_0%_25%,#f7f8fa_0%_50%)] bg-[length:16px_16px] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Signature preview" className="max-h-20 max-w-full object-contain" />
        </div>
      )}
    </div>
  )
}
