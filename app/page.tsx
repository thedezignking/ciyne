'use client'

import { useCallback, useState } from 'react'
import { ArrowLeft, ArrowRight, FileSignature, Lock } from 'lucide-react'
import LandingHero from '@/components/LandingHero'
import HowItWorks from '@/components/HowItWorks'
import WhyCiyne from '@/components/WhyCiyne'
import SiteFooter from '@/components/SiteFooter'
import StepNav from '@/components/StepNav'
import PdfUploader from '@/components/PdfUploader'
import SignatureInput from '@/components/SignatureInput'
import PreviewWorkspace from '@/components/PreviewWorkspace'
import DownloadButton from '@/components/DownloadButton'
import type { AppStep, ProcessPayload, SignaturePlacement } from '@/types'

export default function HomePage() {
  const [focusMode, setFocusMode] = useState(false)
  const [step, setStep] = useState<AppStep>(1)
  const [maxReached, setMaxReached] = useState<AppStep>(1)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [placement, setPlacement] = useState<SignaturePlacement | null>(null)

  const goToStep = useCallback((s: AppStep) => {
    setStep(s)
    setMaxReached((prev) => (s > prev ? s : prev))
  }, [])

  const startSigning = useCallback(() => {
    setFocusMode(true)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }, [])

  const exitSigning = useCallback(() => {
    setFocusMode(false)
  }, [])

  const handlePdf = useCallback(
    (file: File) => {
      setPdfFile(file)
      goToStep(2)
    },
    [goToStep]
  )

  const handleSignature = useCallback((dataUrl: string) => {
    setSignatureDataUrl(dataUrl)
    setPlacement(null)
  }, [])

  const clearSignature = useCallback(() => {
    setSignatureDataUrl(null)
    setPlacement(null)
  }, [])

  const handlePlacement = useCallback((p: SignaturePlacement) => {
    setPlacement(p)
  }, [])

  const processPayload: ProcessPayload | null =
    pdfFile && signatureDataUrl && placement
      ? { ...placement, signatureImage: signatureDataUrl }
      : null

  // ---- Landing view ----
  if (!focusMode) {
    return (
      <div className="min-h-screen bg-page">
        <LandingHero onStart={startSigning} />
        <HowItWorks />
        <WhyCiyne />
        <SiteFooter onStart={startSigning} />
      </div>
    )
  }

  // ---- Focus / signing view ----
  return (
    <div className="flex min-h-screen flex-col bg-page">
      {/* Slim header */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5 sm:px-8">
          <button
            type="button"
            onClick={exitSigning}
            className="focus-accent group inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-secondary transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to home
          </button>
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#1a2332]"
              style={{ background: 'var(--brand-gradient)' }}
              aria-hidden
            >
              <FileSignature className="h-4 w-4" />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-primary">Ciyne</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        {/* Step nav as a horizontal rail */}
        <div className="animate-fade mb-6">
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

        {step === 1 && (
          <StepCard
            key="step1"
            n={1}
            title="Upload your PDF"
            desc="We render the first page so you can place your signature exactly where you want."
          >
            <PdfUploader file={pdfFile} onFile={handlePdf} />
            {pdfFile && (
              <div className="mt-6 flex justify-end">
                <PrimaryButton onClick={() => goToStep(2)}>
                  Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </PrimaryButton>
              </div>
            )}
          </StepCard>
        )}

        {step === 2 && pdfFile && (
          <StepCard
            key="step2"
            n={2}
            title="Add your signature"
            desc="Draw it, type it, or upload a photo. We clean it up automatically."
          >
            <SignatureInput onSignature={handleSignature} onClear={clearSignature} />
            {signatureDataUrl && (
              <div className="mt-6 flex justify-end">
                <PrimaryButton onClick={() => goToStep(3)}>
                  Continue to placement
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </PrimaryButton>
              </div>
            )}
          </StepCard>
        )}

        {step === 3 && pdfFile && signatureDataUrl && (
          <StepCard
            key="step3"
            n={3}
            title="Place & download"
            desc="Drag your signature into position, then download the signed PDF."
          >
            <PreviewWorkspace
              pdfFile={pdfFile}
              signatureDataUrl={signatureDataUrl}
              onPlacement={handlePlacement}
            />
            <div className="mt-8 border-t border-border pt-6">
              <DownloadButton pdfFile={pdfFile} payload={processPayload} disabled={!placement} />
            </div>
          </StepCard>
        )}

        <p className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-muted">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          No account. No watermark. Full quality. Everything stays in your browser.
        </p>
      </main>
    </div>
  )
}

function StepCard({
  n,
  title,
  desc,
  children,
}: {
  n: number
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <section
      className="animate-rise overflow-hidden rounded-3xl border border-black/5 bg-surface"
      style={{ boxShadow: 'var(--shadow-float)' }}
    >
      <div className="border-b border-border/70 px-6 pb-5 pt-6 sm:px-8">
        <span className="text-xs font-bold uppercase tracking-wide text-accent-600">
          Step {n} of 3
        </span>
        <h3 className="mt-1.5 text-2xl font-extrabold tracking-[-0.02em] text-primary">{title}</h3>
        <p className="mt-1.5 text-sm text-secondary">{desc}</p>
      </div>
      <div className="p-6 sm:p-8">{children}</div>
    </section>
  )
}

function PrimaryButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-accent group inline-flex items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-6 py-3 text-sm font-semibold text-[var(--btn-primary-fg)] transition-colors hover:bg-[var(--btn-primary-hover)]"
    >
      {children}
    </button>
  )
}
