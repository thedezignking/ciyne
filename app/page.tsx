'use client'

import { useCallback, useState } from 'react'
import { ArrowRight, Lock } from 'lucide-react'
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
      <section
        id="sign"
        className="scroll-mt-4 border-y border-black/5"
        style={{ background: 'linear-gradient(180deg, #f6faf0 0%, var(--bg-page) 38%)' }}
      >
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              Sign now
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)] sm:text-4xl">
              Sign your PDF
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
              Follow the three steps below. Start by dropping in your document.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div
                className="rounded-3xl border border-black/5 bg-surface p-4"
                style={{ boxShadow: 'var(--shadow-float)' }}
              >
                <StepNav
                  current={step}
                  maxReached={maxReached}
                  onStepClick={(s) => {
                    if (s === 1 || (s === 2 && pdfFile) || (s === 3 && signatureDataUrl)) {
                      setStep(s)
                    }
                  }}
                />
                <div className="mt-3 flex items-center gap-2 rounded-2xl bg-accent-50 px-3.5 py-3 text-xs font-medium text-accent-600">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>No account. No watermark. Full quality.</span>
                </div>
              </div>
            </aside>

            <div>
              {step === 1 && (
                <section
                  key="step1"
                  className="animate-rise overflow-hidden rounded-3xl border border-black/5 bg-surface"
                  style={{ boxShadow: 'var(--shadow-float)' }}
                >
                  <div className="border-b border-border/70 px-6 pb-5 pt-6 sm:px-8">
                    <span className="text-xs font-bold uppercase tracking-wide text-accent-600">
                      Step 1 of 3
                    </span>
                    <h3 className="mt-1.5 text-2xl font-extrabold tracking-[-0.02em] text-primary">
                      Upload your PDF
                    </h3>
                    <p className="mt-1.5 text-sm text-secondary">
                      We render the first page so you can place your signature exactly where you want.
                    </p>
                  </div>
                  <div className="p-6 sm:p-8">
                    <PdfUploader file={pdfFile} onFile={handlePdf} />
                    {pdfFile && (
                      <div className="mt-6 flex justify-end">
                        <button
                          type="button"
                          onClick={() => goToStep(2)}
                          className="focus-accent group inline-flex items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-6 py-3 text-sm font-semibold text-[var(--btn-primary-fg)] transition-colors hover:bg-[var(--btn-primary-hover)]"
                        >
                          Continue
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {step === 2 && pdfFile && (
                <section
                  key="step2"
                  className="animate-rise overflow-hidden rounded-3xl border border-black/5 bg-surface"
                  style={{ boxShadow: 'var(--shadow-float)' }}
                >
                  <div className="border-b border-border/70 px-6 pb-5 pt-6 sm:px-8">
                    <span className="text-xs font-bold uppercase tracking-wide text-accent-600">
                      Step 2 of 3
                    </span>
                    <h3 className="mt-1.5 text-2xl font-extrabold tracking-[-0.02em] text-primary">
                      Add your signature
                    </h3>
                    <p className="mt-1.5 text-sm text-secondary">
                      A photo of your handwritten signature on white paper works best.
                    </p>
                  </div>
                  <div className="space-y-6 p-6 sm:p-8">
                    <SignatureUploader onFile={handleSignatureSource} />
                    {signatureSource && (
                      <SignatureCleaner sourceFile={signatureSource} onCleaned={handleCleaned} />
                    )}
                    {signatureDataUrl && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => goToStep(3)}
                          className="focus-accent group inline-flex items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-6 py-3 text-sm font-semibold text-[var(--btn-primary-fg)] transition-colors hover:bg-[var(--btn-primary-hover)]"
                        >
                          Continue to placement
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {step === 3 && pdfFile && signatureDataUrl && (
                <section
                  key="step3"
                  className="animate-rise overflow-hidden rounded-3xl border border-black/5 bg-surface"
                  style={{ boxShadow: 'var(--shadow-float)' }}
                >
                  <div className="border-b border-border/70 px-6 pb-5 pt-6 sm:px-8">
                    <span className="text-xs font-bold uppercase tracking-wide text-accent-600">
                      Step 3 of 3
                    </span>
                    <h3 className="mt-1.5 text-2xl font-extrabold tracking-[-0.02em] text-primary">
                      Place &amp; download
                    </h3>
                    <p className="mt-1.5 text-sm text-secondary">
                      Drag your signature into position, then download the signed PDF.
                    </p>
                  </div>
                  <div className="p-6 sm:p-8">
                    <PreviewWorkspace
                      pdfFile={pdfFile}
                      signatureDataUrl={signatureDataUrl}
                      onPlacement={handlePlacement}
                    />
                    <div className="mt-8 border-t border-border pt-6">
                      <DownloadButton
                        pdfFile={pdfFile}
                        payload={processPayload}
                        disabled={!placement}
                      />
                    </div>
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
