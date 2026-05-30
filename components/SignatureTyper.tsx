'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { trimToDataUrl } from '@/lib/signatureCanvas'

type SignatureTyperProps = {
  onSignature: (dataUrl: string) => void
}

const FONTS = [
  { id: 'dancing', label: 'Flowing', cssVar: 'var(--font-dancing)', weight: 600 },
  { id: 'caveat', label: 'Casual', cssVar: 'var(--font-caveat)', weight: 600 },
  { id: 'great-vibes', label: 'Formal', cssVar: 'var(--font-great-vibes)', weight: 400 },
]

const INK = '#1a2332'

function resolveCssVar(cssVar: string): string {
  if (typeof window === 'undefined') return cssVar
  const raw = cssVar.replace(/^var\(/, '').replace(/\)$/, '')
  return getComputedStyle(document.documentElement).getPropertyValue(raw).trim() || cssVar
}

export default function SignatureTyper({ onSignature }: SignatureTyperProps) {
  const [text, setText] = useState('')
  const [fontId, setFontId] = useState(FONTS[0].id)
  const font = FONTS.find((f) => f.id === fontId) ?? FONTS[0]

  const render = async () => {
    const value = text.trim()
    if (!value) return

    const fontPx = 160
    const pad = 50
    const resolvedFamily = resolveCssVar(font.cssVar)
    const fontSpec = `${font.weight} ${fontPx}px ${resolvedFamily}`

    try {
      await document.fonts.load(fontSpec, value)
    } catch {
      /* fall through */
    }

    const measure = document.createElement('canvas').getContext('2d')!
    measure.font = fontSpec
    const textW = Math.ceil(measure.measureText(value).width)

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1
    const canvas = document.createElement('canvas')
    canvas.width = (textW + pad * 2) * dpr
    canvas.height = Math.ceil(fontPx * 1.8) * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.font = fontSpec
    ctx.fillStyle = INK
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(value, pad, Math.ceil(fontPx * 1.8) / 2)

    const dataUrl = trimToDataUrl(canvas)
    if (dataUrl) onSignature(dataUrl)
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your name"
        maxLength={40}
        className="focus-accent w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-primary outline-none placeholder:text-muted"
        aria-label="Type your signature"
      />

      {/* Style picker with live previews */}
      <div className="grid grid-cols-3 gap-2">
        {FONTS.map((f) => {
          const active = f.id === fontId
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFontId(f.id)}
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void render()}
          disabled={!text.trim()}
          className="focus-accent group inline-flex items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--btn-primary-fg)] transition-colors hover:bg-[var(--btn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" aria-hidden />
          Use this signature
        </button>
      </div>
    </div>
  )
}
