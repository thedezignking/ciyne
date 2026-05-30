import { ShieldOff, FileCheck, Layers, Infinity } from 'lucide-react'
import Reveal from '@/components/Reveal'

const POINTS = [
  {
    icon: ShieldOff,
    title: 'No account needed',
    body: 'No email, no password, no verification step. Open the page and start signing.',
  },
  {
    icon: FileCheck,
    title: 'Clean output',
    body: 'No watermark, no Ciyne branding, no fine print on your document. The signed PDF is yours.',
  },
  {
    icon: Layers,
    title: 'Original quality',
    body: 'Your signature is composited onto the original file. No re-encoding, no resolution loss.',
  },
  {
    icon: Infinity,
    title: 'Free, no limits',
    body: 'Sign as many documents as you need. No trial period, no per-document fee, no premium tier.',
  },
]

export default function WhyCiyne() {
  return (
    <section id="why" className="scroll-mt-6 border-t border-border/50">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          {/* Left — heading */}
          <Reveal>
            <div className="lg:sticky lg:top-24">
              <span className="text-sm font-semibold tracking-wide text-accent-600">
                Why Ciyne
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Built to get out of your way.
              </h2>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-[var(--text-secondary)]">
                Most signing tools gate features behind accounts and paywalls. Ciyne has neither.
              </p>
            </div>
          </Reveal>

          {/* Right — 2x2 grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            {POINTS.map((p, i) => {
              const Icon = p.icon
              return (
                <Reveal key={p.title} delay={i * 80}>
                  <div className="group h-full rounded-2xl border border-border/70 bg-surface p-6 transition-all duration-200 hover:border-accent-500/40 hover:shadow-sm">
                    <span className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl border border-border bg-surface text-accent-600 transition-all duration-200 group-hover:border-accent-500/50 group-hover:bg-accent-50">
                      <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
                    </span>
                    <h3 className="mt-5 text-[15px] font-bold text-[var(--text-primary)]">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {p.body}
                    </p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
