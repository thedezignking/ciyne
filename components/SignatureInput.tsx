'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PenLine, Type, ImageUp } from 'lucide-react'
import SignaturePad from '@/components/SignaturePad'
import SignatureTyper from '@/components/SignatureTyper'
import SignatureUploader from '@/components/SignatureUploader'
import SignatureCleaner from '@/components/SignatureCleaner'
import { refineSignature, type InkColor } from '@/lib/refineSignature'

type Mode = 'draw' | 'type' | 'upload'

type SignatureInputProps = {
  /** Called with a transparent-PNG data URL whenever a signature is ready. */
  onSignature: (dataUrl: string) => void
  /** Called when the in-progress signature should be discarded (tab switch). */
  onClear: () => void
}

const TABS: { id: Mode; label: string; icon: typeof PenLine }[] = [
  { id: 'draw', label: 'Draw', icon: PenLine },
  { id: 'type', label: 'Type', icon: Type },
  { id: 'upload', label: 'Upload photo', icon: ImageUp },
]

const SWATCH: Record<'navy' | 'black', string> = {
  navy: '#2b3a67',
  black: '#1a1a1e',
}

export default function SignatureInput({ onSignature, onClear }: SignatureInputProps) {
  const [mode, setMode] = useState<Mode>('draw')
  const [uploadSource, setUploadSource] = useState<File | null>(null)
  const [color, setColor] = useState<InkColor>('navy')
  const [weight, setWeight] = useState(1.0)

  // The most recent raw (pre-refine) signature, so we can re-color on demand.
  const rawRef = useRef<string | null>(null)

  // Draw mode bakes its own color + thickness in — pass it straight through.
  const handleDrawn = useCallback((dataUrl: string) => onSignature(dataUrl), [onSignature])

  // Type / upload go through the refine step (thicken + recolor).
  const applyRefine = useCallback(
    async (raw: string, ink: InkColor, w: number) => {
      const refined = await refineSignature(raw, ink, w)
      onSignature(refined)
    },
    [onSignature]
  )

  const handleRefined = useCallback(
    (dataUrl: string) => {
      rawRef.current = dataUrl
      void applyRefine(dataUrl, color, weight)
    },
    [applyRefine, color, weight]
  )

  // Re-refine when color or weight changes.
  useEffect(() => {
    if (mode !== 'draw' && rawRef.current) void applyRefine(rawRef.current, color, weight)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, weight])

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setUploadSource(null)
    rawRef.current = null
    if (next !== 'upload' && color === 'original') setColor('navy')
    onClear()
  }

  const colorOptions: InkColor[] = mode === 'upload' ? ['navy', 'black', 'original'] : ['navy', 'black']

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Signature method"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-page/60 p-1"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = tab.id === mode
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => switchMode(tab.id)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Panel */}
      {mode === 'draw' && <SignaturePad onSignature={handleDrawn} />}

      {mode === 'type' && (
        <div className="space-y-4">
          <InkSelector options={colorOptions} color={color} onColorChange={setColor} weight={weight} onWeightChange={setWeight} />
          <SignatureTyper onSignature={handleRefined} />
        </div>
      )}

      {mode === 'upload' && (
        <div className="space-y-6">
          <SignatureUploader
            onFile={(f) => {
              setUploadSource(f)
              rawRef.current = null
              onClear()
            }}
          />
          {uploadSource && (
            <div className="space-y-4">
              <InkSelector options={colorOptions} color={color} onColorChange={setColor} weight={weight} onWeightChange={setWeight} />
              <SignatureCleaner
                sourceFile={uploadSource}
                onCleaned={(_blob, dataUrl) => handleRefined(dataUrl)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InkSelector({
  options,
  color,
  onColorChange,
  weight,
  onWeightChange,
}: {
  options: InkColor[]
  color: InkColor
  onColorChange: (c: InkColor) => void
  weight: number
  onWeightChange: (w: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      {/* Color */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Ink</span>
        {options.map((opt) => {
          const active = color === opt
          if (opt === 'original') {
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onColorChange('original')}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-accent-600 bg-accent-50 text-accent-600'
                    : 'border-border bg-surface text-secondary hover:text-primary'
                }`}
              >
                <span
                  className="block h-3.5 w-3.5 rounded-full"
                  style={{ background: 'conic-gradient(red, orange, gold, green, blue, violet, red)' }}
                  aria-hidden
                />
                Original
              </button>
            )
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onColorChange(opt)}
              aria-pressed={active}
              aria-label={`${opt} ink`}
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform ${
                active ? 'border-accent-600 scale-110' : 'border-border hover:border-border-strong'
              }`}
            >
              <span className="block h-4 w-4 rounded-full" style={{ background: SWATCH[opt] }} aria-hidden />
            </button>
          )
        })}
      </div>

      {/* Weight */}
      <label className="flex items-center gap-2 text-xs font-medium text-secondary">
        <span className="font-semibold uppercase tracking-wide">Weight</span>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={weight}
          onChange={(e) => onWeightChange(Number(e.target.value))}
          className="h-1.5 w-24 cursor-pointer accent-accent-600"
          aria-label="Stroke thickness"
        />
      </label>
    </div>
  )
}
