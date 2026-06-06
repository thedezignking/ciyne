'use client'

import { ArrowRight, FileSignature } from 'lucide-react'
import Reveal from '@/components/Reveal'

type SiteFooterProps = {
  onStart: () => void
}

export default function SiteFooter({ onStart }: SiteFooterProps) {
  return (
    <footer className="border-t border-border bg-page">
      {/* Final CTA */}
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <Reveal
          className="relative overflow-hidden rounded-[28px] border border-black/5 px-8 py-12 text-center sm:py-16"
          style={{ background: 'var(--hero-mesh)' }}
        >
          <h2 className="mx-auto max-w-xl text-balance text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Ready to sign your PDF?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base text-[var(--text-secondary)]">
            No account, no watermark, no waiting. It takes about a minute.
          </p>
          <button
            type="button"
            onClick={onStart}
            className="focus-accent group mt-7 inline-flex items-center gap-2 rounded-full bg-[#1a2332] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0f1722]"
          >
            Sign a PDF now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </Reveal>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-border px-5 py-8 sm:flex-row sm:px-8">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#1a2332]"
            style={{ background: 'var(--brand-gradient)' }}
          >
            <FileSignature className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-bold text-[var(--text-primary)]">Ciyne</span>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          AI-powered PDF signing · no account · no watermark
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} Ciyne
        </p>
      </div>
    </footer>
  )
}
