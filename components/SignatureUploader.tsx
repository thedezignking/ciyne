'use client'

import { useCallback, useRef, useState } from 'react'
import { ImageUp } from 'lucide-react'
import { ACCEPTED_SIGNATURE_TYPES } from '@/types'

type SignatureUploaderProps = {
  onFile: (file: File) => void
}

export default function SignatureUploader({ onFile }: SignatureUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(
    (f: File) => {
      if (!ACCEPTED_SIGNATURE_TYPES.includes(f.type as (typeof ACCEPTED_SIGNATURE_TYPES)[number])) {
        setError('Use JPG, PNG, or WEBP for your signature.')
        return
      }
      setError(null)
      onFile(f)
    },
    [onFile]
  )

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
          dragOver
            ? 'border-accent-500 bg-accent-50'
            : 'border-border bg-surface hover:border-accent-500/50'
        }`}
      >
        <ImageUp className="mb-2 h-8 w-8 text-muted" aria-hidden />
        <p className="text-sm font-semibold text-primary">Upload signature photo</p>
        <p className="mt-1 text-sm text-secondary">JPG, PNG, or WEBP</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
