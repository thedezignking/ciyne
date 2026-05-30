'use client'

import { useCallback, useState } from 'react'
import StepNav from '@/components/StepNav'
import PdfUploader from '@/components/PdfUploader'
import SignatureUploader from '@/components/SignatureUploader'
import SignatureCleaner from '@/components/SignatureCleaner'
import PreviewWorkspace from '@/components/PreviewWorkspace'
import DownloadButton from '@/components/DownloadButton'
import type { AppStep, ProcessPayload, SignaturePlacement } from '@/types'

export default function HomePage() {
  const [step, setStep] = useState<AppStep>(1)
  const [maxReached, setMaxReached] = useState<AppStep>(1)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [signatureSource, setSignatureSource] = useState<File | null>(null)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [placement, setPlacement] = useState<SignaturePlacement | null>(null)

  const goToStep = useCallback((s: AppStep) => {
    setStep(s)
    setMaxReached((prev) => (s > prev ? s : prev))
  }, [])

  const handlePdf = useCallback(
    (file: File) => {
      setPdfFile(file)
      goToStep(2)
    },
    [goToStep]
  )

  const handleSignatureSource = useCallback(
    (file: File) => {
      setSignatureSource(file)
      setSignatureDataUrl(null)
      setPlacement(null)
    },
    []
  )

  const handleCleaned = useCallback(
    (_blob: Blob, dataUrl: string) => {
      setSignatureDataUrl(dataUrl)
    },
    []
  )

  const handlePlacement = useCallback((p: SignaturePlacement) => {
    setPlacement(p)
  }, [])

  const processPayload: ProcessPayload | null =
    pdfFile && signatureDataUrl && placement
      ? { ...placement, signatureImage: signatureDataUrl }
      : null

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-white"
              style={{
                background:
                  'linear-gradient(135deg, var(--lemon-200) 0%, var(--accent-500) 100%)',
              }}
              aria-hidden
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="text-lg font-bold tracking-tight text-primary">Ciyne</span>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-accent-500/30 bg-accent-50 px-3 py-1 text-xs font-medium text-accent-600 sm:inline-flex">
            Free · no account · no watermark
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <StepNav
            current={step}
            maxReached={maxReached}
            onStepClick={(s) => {
              if (s === 1 || (s === 2 && pdfFile) || (s === 3 && signatureDataUrl)) {
                setStep(s)
              }
            }}
          />
        </aside>

        <div className="space-y-6">
          {step === 1 && (
            <section className="rounded-lg border border-border bg-surface p-6 shadow-card">
              <h1 className="text-xl font-bold text-primary">Upload your PDF</h1>
              <p className="mt-2 text-sm text-secondary">
                We render the first page so you can place your signature exactly where you want.
              </p>
              <div className="mt-6">
                <PdfUploader file={pdfFile} onFile={handlePdf} />
              </div>
              {pdfFile && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="focus-accent rounded-md bg-[var(--btn-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover)] transition-colors"
                  >
                    Continue
                  </button>
                </div>
              )}
            </section>
          )}

          {step === 2 && pdfFile && (
            <section className="rounded-lg border border-border bg-surface p-6 shadow-card">
              <h1 className="text-xl font-bold text-primary">Add your signature</h1>
              <p className="mt-2 text-sm text-secondary">
                Photo of your handwritten signature on white paper works best.
              </p>
              <div className="mt-6 space-y-6">
                <SignatureUploader onFile={handleSignatureSource} />
                {signatureSource && (
                  <SignatureCleaner sourceFile={signatureSource} onCleaned={handleCleaned} />
                )}
              </div>
              {signatureDataUrl && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="focus-accent rounded-md bg-[var(--btn-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover)] transition-colors"
                  >
                    Continue to placement
                  </button>
                </div>
              )}
            </section>
          )}

          {step === 3 && pdfFile && signatureDataUrl && (
            <section className="rounded-lg border border-border bg-surface p-6 shadow-card">
              <h1 className="text-xl font-bold text-primary">Place your signature</h1>
              <div className="mt-6">
                <PreviewWorkspace
                  pdfFile={pdfFile}
                  signatureDataUrl={signatureDataUrl}
                  onPlacement={handlePlacement}
                />
              </div>
              <div className="mt-8 border-t border-border pt-6">
                <DownloadButton
                  pdfFile={pdfFile}
                  payload={processPayload}
                  disabled={!placement}
                />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
