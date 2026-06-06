'use client'

import { ArrowRight, FileSignature } from 'lucide-react'
import HeroDocStack from '@/components/HeroDocStack'

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2.5">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl text-[#1a2332] shadow-sm"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <FileSignature className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
        Ciyne
      </span>
    </a>
  )
}

type LandingHeroProps = {
  onStart: () => void
}

export default function LandingHero({ onStart }: LandingHeroProps) {
  return (
    <section id="top" className="px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className="relative overflow-hidden rounded-[28px] border border-black/5"
        style={{ background: 'var(--hero-mesh)' }}
      >
        {/* subtle grain / vignette for depth */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            background:
              'radial-gradient(120% 80% at 50% 0%, transparent 55%, rgba(255,255,255,0.6) 100%)',
          }}
          aria-hidden
        />

        {/* Nav */}
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-2 sm:gap-5">
            <a
              href="#how"
              className="hidden text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] sm:block"
            >
              How it works
            </a>
            <a
              href="#why"
              className="hidden text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] sm:block"
            >
              Why Ciyne
            </a>
            <button
              type="button"
              onClick={onStart}
              className="focus-accent rounded-full bg-[#1a2332] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0f1722]"
            >
              Sign a PDF
            </button>
          </nav>
        </header>

        {/* Hero content */}
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pb-24">
          <div className="max-w-xl">
            <span className="animate-fade inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              Free forever · No account needed
            </span>

            <h1
              className="animate-rise mt-5 text-balance text-[clamp(2.5rem,7vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--text-primary)]"
              style={{ animationDelay: '0.05s' }}
            >
              Sign &amp; fill any
              <br />
              PDF in seconds.
            </h1>

            <p
              className="animate-rise mt-5 max-w-md text-pretty text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg"
              style={{ animationDelay: '0.15s' }}
            >
              Upload a document, let AI detect the blanks, fill in your details, place your
              signature, and download — all in your browser. No watermark, no sign-up.
            </p>

            <div
              className="animate-rise mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '0.25s' }}
            >
              <button
                type="button"
                onClick={onStart}
                className="focus-accent group inline-flex items-center gap-2 rounded-full bg-[#1a2332] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0f1722]"
              >
                Sign a PDF now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a
                href="#how"
                className="focus-accent inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-6 py-3.5 text-sm font-semibold text-[var(--text-primary)] backdrop-blur transition-colors hover:bg-white"
              >
                See how it works
              </a>
            </div>

            <p
              className="animate-fade mt-6 text-xs font-medium text-[var(--text-muted)]"
              style={{ animationDelay: '0.4s' }}
            >
              Works with any PDF · AI form filling · Up to 20 MB
            </p>
          </div>

          <div className="animate-fade" style={{ animationDelay: '0.3s' }}>
            <HeroDocStack />
          </div>
        </div>
      </div>
    </section>
  )
}
