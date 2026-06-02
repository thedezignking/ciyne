'use client'

import { useCallback, useState } from 'react'
import { FileText, Loader2, ScanSearch, Check, X } from 'lucide-react'
import { detectTextFields } from '@/lib/detectTextFields'
import type { TextFieldDetection, FilledTextField } from '@/types'

type DetectStatus = 'idle' | 'detecting' | 'done' | 'error' | 'unconfigured'

type TextFieldsPanelProps = {
  pdfFile: File
  pageIndex: number
  onFilledFields: (fields: FilledTextField[]) => void
}

export default function TextFieldsPanel({
  pdfFile,
  pageIndex,
  onFilledFields,
}: TextFieldsPanelProps) {
  const [status, setStatus] = useState<DetectStatus>('idle')
  const [fields, setFields] = useState<TextFieldDetection[]>([])
  const [values, setValues] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const runDetect = useCallback(async () => {
    setStatus('detecting')
    setError(null)
    setApplied(false)
    const result = await detectTextFields(pdfFile, pageIndex)
    if (!result.ok) {
      if (!result.configured) {
        setStatus('unconfigured')
      } else {
        setStatus('error')
        setError(result.error)
      }
      return
    }
    setFields(result.fields)
    setValues({})
    setStatus('done')
  }, [pdfFile, pageIndex])

  const handleValueChange = useCallback(
    (idx: number, value: string) => {
      const next = { ...values, [idx]: value }
      setValues(next)
      setApplied(false)

      const filled: FilledTextField[] = fields
        .map((f, i) => ({
          ...f,
          value: next[i] ?? '',
          pageIndex,
        }))
        .filter((f) => f.value.trim().length > 0)
      onFilledFields(filled)
    },
    [values, fields, pageIndex, onFilledFields]
  )

  const handleApplyAll = useCallback(() => {
    const filled: FilledTextField[] = fields
      .map((f, i) => ({
        ...f,
        value: values[i] ?? '',
        pageIndex,
      }))
      .filter((f) => f.value.trim().length > 0)
    onFilledFields(filled)
    setApplied(true)
  }, [fields, values, pageIndex, onFilledFields])

  const handleClear = useCallback(() => {
    setFields([])
    setValues({})
    setStatus('idle')
    setApplied(false)
    onFilledFields([])
  }, [onFilledFields])

  const filledCount = Object.values(values).filter((v) => v.trim()).length

  return (
    <div className="rounded-2xl border border-border bg-page/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-primary">Fill in document fields</p>
            <p className="text-xs text-secondary">
              AI finds placeholders like [Your Name], dates, and blanks so you can fill them in.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'done' && fields.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="focus-accent inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-secondary transition-colors hover:text-primary"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => void runDetect()}
            disabled={status === 'detecting'}
            className="focus-accent inline-flex items-center gap-2 rounded-full border border-blue-600/40 bg-surface px-4 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-60"
          >
            {status === 'detecting' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ScanSearch className="h-4 w-4" aria-hidden />
            )}
            {status === 'detecting'
              ? 'Scanning…'
              : status === 'done' && fields.length > 0
                ? 'Re-scan'
                : 'Find fields with AI'}
          </button>
        </div>
      </div>

      {status === 'unconfigured' && (
        <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted">
          AI detection isn&apos;t enabled on this deployment.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-3 border-t border-border/70 pt-3 text-xs text-red-600" role="alert">
          {error ?? 'Detection failed.'}
        </p>
      )}

      {status === 'done' && fields.length === 0 && (
        <p className="mt-3 border-t border-border/70 pt-3 text-xs text-secondary">
          No text placeholders detected on this page.
        </p>
      )}

      {status === 'done' && fields.length > 0 && (
        <div className="mt-3 space-y-3 border-t border-border/70 pt-3">
          <p className="text-xs font-medium text-secondary">
            Found {fields.length} {fields.length === 1 ? 'field' : 'fields'} — fill in below:
          </p>

          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={i} className="flex items-center gap-3">
                <label className="min-w-[100px] shrink-0 text-right text-sm font-semibold text-primary">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={values[i] ?? ''}
                  onChange={(e) => handleValueChange(i, e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  className="focus-accent min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none placeholder:text-muted"
                />
              </div>
            ))}
          </div>

          {filledCount > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleApplyAll}
                disabled={applied}
                className="focus-accent inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                {applied ? 'Applied' : `Apply ${filledCount} ${filledCount === 1 ? 'field' : 'fields'}`}
              </button>
              {applied && (
                <span className="text-xs font-medium text-blue-600">
                  Text will be embedded when you download.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
