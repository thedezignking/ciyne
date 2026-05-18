'use client'

import { useCallback, useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { MAX_PDF_BYTES } from '@/types'

type PdfUploaderProps = {
  file: File | null
  onFile: (file: File) => void
}

export default function PdfUploader({ file, onFile }: PdfUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const validate = useCallback((f: File) => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      return 'Please upload a PDF file.'
    }
    if (f.size > MAX_PDF_BYTES) {
      return 'PDF must be 20MB or smaller.'
    }
    return null
  }, [])

  const handleFile = useCallback(
    (f: File) => {
      const msg = validate(f)
      if (msg) {
        setError(msg)
        return
      }
      setError(null)
      onFile(f)
    },
    [onFile, validate]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
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
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${
          dragOver
            ? 'border-accent-500 bg-accent-50'
            : 'border-border bg-surface hover:border-accent-500/50 hover:bg-accent-50/50'
        }`}
      >
        <FileUp className="mb-3 h-10 w-10 text-muted" aria-hidden />
        <p className="text-sm font-semibold text-primary">Drop your PDF here</p>
        <p className="mt-1 text-sm text-secondary">or click to browse · max 20MB</p>
        {file && (
          <p className="mt-3 rounded-md bg-accent-50 px-3 py-1 text-sm font-medium text-accent-600">
            {file.name}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
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
