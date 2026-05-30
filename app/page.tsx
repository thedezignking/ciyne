'use client'

import { useCallback, useState } from 'react'
import LandingHero from '@/components/LandingHero'
import HowItWorks from '@/components/HowItWorks'
import WhyCiyne from '@/components/WhyCiyne'
import SiteFooter from '@/components/SiteFooter'
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

  const handleSignatureSource = useCallback((file: File) => {
    setSignatureSource(file)
    setSignatureDataUrl(null)
    setPlacement(null)
  }, [])

  const handleCleaned = useCallback((_blob: Blob, dataUrl: string) => {
    setSignatureDataUrl(dataUrl)
  }, [])

  const handlePlacement = useCallback((p: SignaturePlacement) => {
    setPlacement(p)
  }, [])

  const processPayload: ProcessPayload | null =
    pdfFile && signatureDataUrl && placement
      ? { ...placement, signatureImage: signatureDataUrl }
      : null

  return (
    <div className="min-h-screen bg-page">
      <LandingHero />

      <HowItWorks />

      {/* The tool */}
      <section id="sign" className="scroll-mt-4 bg-page">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="text-sm font-semibold text-accent-600">Sign now</span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Sign your PDF
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
              Everything runs right here. Start by uploading your document below.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl border border-border bg-surface p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                <StepNav
                  current={step}
                  maxReached={maxReached}
                  onStepClick={(s) => {
                    if (s === 1 || (s === 2 && pdfFile) || (s === 3 && signatureDataUrl)) {
                      setStep(s)
                    }
                  }}
                />
              </div>
            </aside>

            <div className="space-y-6">
              {step === 1 && (
                <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <h3 className="text-xl font-bold text-primary">Upload your PDF</h3>
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
                        className="focus-accent rounded-md bg-[var(--btn-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--btn-primary-fg)] transition-colors hover:bg-[var(--btn-primary-hover)]"
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </section>
              )}

              {step === 2 && pdfFile && (
                <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <h3 className="text-xl font-bold text-primary">Add your signature</h3>
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
                        className="focus-accent rounded-md bg-[var(--btn-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--btn-primary-fg)] transition-colors hover:bg-[var(--btn-primary-hover)]"
                      >
                        Continue to placement
                      </button>
                    </div>
                  )}
                </section>
              )}

              {step === 3 && pdfFile && signatureDataUrl && (
                <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
                  <h3 className="text-xl font-bold text-primary">Place your signature</h3>
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
          </div>
        </div>
      </section>

      <WhyCiyne />

      <SiteFooter />
    </div>
  )
}
