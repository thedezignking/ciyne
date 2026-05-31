'use client'

import { useCallback, useState } from 'react'
import { ArrowLeft, ArrowRight, FileSignature, FileText, Lock, MousePointer2, PenLine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import LandingHero from '@/components/LandingHero'
import HowItWorks from '@/components/HowItWorks'
import WhyCiyne from '@/components/WhyCiyne'
import FAQ from '@/components/FAQ'
import SiteFooter from '@/components/SiteFooter'
import ProgressRail from '@/components/ProgressRail'
import PdfUploader from '@/components/PdfUploader'
import SignatureInput from '@/components/SignatureInput'
import PreviewWorkspace from '@/components/PreviewWorkspace'
import DownloadButton from '@/components/DownloadButton'
import type { AppStep, ProcessPayload, SignaturePlacement } from '@/types'
import { emptyDraft, type SignatureDraft } from '@/types/signatureDraft'

export default function HomePage() {
  const [focusMode, setFocusMode] = useState(false)
  const [step, setStep] = useState<AppStep>(1)
  const [maxReached, setMaxReached] = useState<AppStep>(1)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [draft, setDraft] = useState<SignatureDraft>(emptyDraft)
  const [placement, setPlacement] = useState<SignaturePlacement | null>(null)
  const [batchPlacements, setBatchPlacements] = useState<SignaturePlacement[] | null>(null)

  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  const goToStep = useCallback((s: AppStep) => {
    setStep((prev) => {
      setDirection(s >= prev ? 'forward' : 'back')
      return s
    })
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

  const handleSignature = useCallback((dataUrl: string | null) => {
    setSignatureDataUrl((prev) => {
      // Only discard placements when the signature actually changes.
      if (prev !== dataUrl) {
        setPlacement(null)
        setBatchPlacements(null)
      }
      return dataUrl
    })
  }, [])

  const patchDraft = useCallback((patch: Partial<SignatureDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const handlePlacement = useCallback((p: SignaturePlacement) => {
    setPlacement(p)
  }, [])

  const handleSignAll = useCallback((pls: SignaturePlacement[] | null) => {
    setBatchPlacements(pls && pls.length > 0 ? pls : null)
  }, [])

  const processPayload: ProcessPayload | null = !pdfFile || !signatureDataUrl
    ? null
    : batchPlacements && batchPlacements.length > 0
      ? { ...batchPlacements[0], signatureImage: signatureDataUrl, placements: batchPlacements }
      : placement
        ? { ...placement, signatureImage: signatureDataUrl }
        : null

  // ---- Landing view ----
  if (!focusMode) {
    return (
      <div className="min-h-screen bg-page">
        <LandingHero onStart={startSigning} />
        <HowItWorks />
        <WhyCiyne />
        <FAQ />
        <SiteFooter onStart={startSigning} />
      </div>
    )
  }

  // ---- Focus / signing view ----
  const stepAnim = direction === 'forward' ? 'step-forward' : 'step-back'

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: 'linear-gradient(180deg, #f6faf0 0%, var(--bg-page) 30%)' }}
    >
      {/* Slim header */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-8">
          <button
            type="button"
            onClick={exitSigning}
            className="focus-accent group inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-secondary transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to home</span>
            <span className="sm:hidden">Back</span>
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        {/* Horizontal progress rail */}
        <div
          className="animate-fade mb-7 rounded-2xl border border-black/5 bg-surface px-4 py-5 sm:px-8"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <ProgressRail
            current={step}
            maxReached={maxReached}
            onStepClick={(s) => {
              if (s === 1 || (s === 2 && pdfFile) || (s === 3 && signatureDataUrl)) {
                goToStep(s)
              }
            }}
          />
        </div>

        {step === 1 && (
          <StepCard
            key={`step1-${step}`}
            className={stepAnim}
            n={1}
            icon={FileText}
            title="Upload your PDF"
            desc="We render every page so you can place your signature exactly where you want."
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
            key={`step2-${step}`}
            className={stepAnim}
            n={2}
            icon={PenLine}
            title="Add your signature"
            desc="Draw it, type it, or upload a photo. We clean it up automatically."
          >
            <SignatureInput draft={draft} onDraftChange={patchDraft} onSignature={handleSignature} />
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
            key={`step3-${step}`}
            className={stepAnim}
            n={3}
            icon={MousePointer2}
            title="Sign your document"
            desc="Navigate to any page, drag your signature into position, then download."
          >
            <PreviewWorkspace
              pdfFile={pdfFile}
              signatureDataUrl={signatureDataUrl}
              onPlacement={handlePlacement}
              onSignAll={handleSignAll}
            />
            <div className="mt-8 border-t border-border pt-6">
              <DownloadButton
                pdfFile={pdfFile}
                payload={processPayload}
                disabled={!processPayload}
                onEditSignature={() => goToStep(2)}
              />
            </div>
          </StepCard>
        )}

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs font-medium text-muted">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          No account. No watermark. Full quality. Everything stays in your browser.
        </p>
      </main>
    </div>
  )
}

function StepCard({
  n,
  icon: Icon,
  title,
  desc,
  children,
  className = '',
}: {
  n: number
  icon: LucideIcon
  title: string
  desc: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`overflow-hidden rounded-3xl border border-black/5 bg-surface ${className}`}
      style={{ boxShadow: 'var(--shadow-float)' }}
    >
      <div className="flex items-start gap-4 border-b border-border/70 px-6 pb-5 pt-6 sm:px-8">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[#1a2332] shadow-sm"
          style={{ background: 'var(--brand-gradient)' }}
          aria-hidden
        >
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-wide text-accent-600">
            Step {n} of 3
          </span>
          <h3 className="mt-0.5 text-2xl font-extrabold tracking-[-0.02em] text-primary">{title}</h3>
          <p className="mt-1 text-sm text-secondary">{desc}</p>
        </div>
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
