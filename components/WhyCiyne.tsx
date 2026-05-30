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
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
          {/* Left — heading */}
          <Reveal>
            <div className="lg:sticky lg:top-24">
              <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Built to get out
                <br className="hidden sm:block" />
                {' '}of your way.
              </h2>
              <p className="mt-3 max-w-sm text-base leading-relaxed text-[var(--text-secondary)]">
                Most signing tools gate features behind accounts and paywalls. Ciyne has neither.
              </p>
            </div>
          </Reveal>

          {/* Right — points */}
          <div className="grid gap-10 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-12">
            {POINTS.map((p, i) => {
              const Icon = p.icon
              return (
                <Reveal key={p.title} delay={i * 80}>
                  <div className="group">
                    <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600 transition-colors duration-200 group-hover:bg-accent-500 group-hover:text-[#1a2332]">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                    </span>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
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
