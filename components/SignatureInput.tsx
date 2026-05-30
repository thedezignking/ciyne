'use client'

import { useState } from 'react'
import { PenLine, Type, ImageUp } from 'lucide-react'
import SignaturePad from '@/components/SignaturePad'
import SignatureTyper from '@/components/SignatureTyper'
import SignatureUploader from '@/components/SignatureUploader'
import SignatureCleaner from '@/components/SignatureCleaner'

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

export default function SignatureInput({ onSignature, onClear }: SignatureInputProps) {
  const [mode, setMode] = useState<Mode>('draw')
  const [uploadSource, setUploadSource] = useState<File | null>(null)

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setUploadSource(null)
    onClear()
  }

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
      {mode === 'draw' && <SignaturePad onSignature={onSignature} />}

      {mode === 'type' && <SignatureTyper onSignature={onSignature} />}

      {mode === 'upload' && (
        <div className="space-y-6">
          <SignatureUploader
            onFile={(f) => {
              setUploadSource(f)
              onClear()
            }}
          />
          {uploadSource && (
            <SignatureCleaner
              sourceFile={uploadSource}
              onCleaned={(_blob, dataUrl) => onSignature(dataUrl)}
            />
          )}
        </div>
      )}
    </div>
  )
}
