import { BadgeCheck, Droplet, Sparkles, Wallet } from 'lucide-react'
import Reveal from '@/components/Reveal'

const POINTS = [
  {
    icon: Wallet,
    title: 'No account, ever',
    body: 'Skip the sign-up wall. Open the page and start signing immediately.',
  },
  {
    icon: Droplet,
    title: 'No watermark',
    body: 'Your signed PDF comes out clean. No Ciyne logo stamped across your document.',
  },
  {
    icon: BadgeCheck,
    title: 'Full quality',
    body: 'We place your signature on the original file. No re-compression, no blurry pages.',
  },
  {
    icon: Sparkles,
    title: 'Free, no limits',
    body: 'Sign as many documents as you need. No trials, no per-document fees.',
  },
]

export default function WhyCiyne() {
  return (
    <section id="why" className="scroll-mt-6 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <Reveal className="max-w-2xl">
          <span className="text-sm font-semibold text-accent-600">Why Ciyne</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Built to get out of your way.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
            Most signing tools want your email before they want to help. Ciyne just signs the PDF.
          </p>
        </Reveal>

        {/* Bento grid: 2 tall + 2 short, or 2x2 with varying emphasis */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {POINTS.map((p, i) => {
            const Icon = p.icon
            const isFeatured = i === 0 || i === 3
            return (
              <Reveal key={p.title} delay={i * 100}>
                <div
                  className={`group relative overflow-hidden rounded-3xl border border-border/60 transition-all duration-300 hover:border-accent-500/30 ${
                    isFeatured ? 'bg-accent-50/40 p-8 sm:p-9' : 'bg-surface p-7 sm:p-8'
                  }`}
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 ${
                      isFeatured
                        ? 'bg-accent-500 text-[#1a2332] shadow-sm'
                        : 'bg-accent-50 text-accent-600 group-hover:bg-accent-500 group-hover:text-[#1a2332]'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-extrabold text-[var(--text-primary)]">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {p.body}
                  </p>

                  {/* Decorative gradient orb */}
                  <div
                    className="pointer-events-none absolute -bottom-12 -right-12 h-36 w-36 rounded-full opacity-[0.06] transition-opacity duration-500 group-hover:opacity-[0.14]"
                    style={{ background: 'var(--brand-gradient)' }}
                    aria-hidden
                  />
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
