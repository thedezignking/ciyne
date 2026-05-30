import { FileText, PenLine, MousePointer2, ArrowRight } from 'lucide-react'
import Reveal from '@/components/Reveal'

const STEPS = [
  {
    icon: FileText,
    title: 'Upload your PDF',
    body: 'Drop in any PDF up to 20 MB. We render every page so you can see exactly what you are signing.',
  },
  {
    icon: PenLine,
    title: 'Add your signature',
    body: 'Draw it, type it, or snap a photo. Ciyne removes the paper background automatically.',
  },
  {
    icon: MousePointer2,
    title: 'Place & download',
    body: 'Drag your signature to the right spot on any page, resize it, and download in full quality.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-20 sm:px-8">
      <Reveal className="max-w-2xl">
        <span className="text-sm font-semibold text-accent-600">How it works</span>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          Three steps, under two minutes.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
          No tutorials, no setup. Open Ciyne, sign, and get back to work.
        </p>
      </Reveal>

      {/* Bento grid: featured card on top, two cards below */}
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {/* Featured step 1 — spans full width */}
        <Reveal className="md:col-span-2">
          <div
            className="group relative overflow-hidden rounded-3xl border border-border/60 bg-surface p-8 sm:p-10"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-accent-500 group-hover:text-[#1a2332]">
                <FileText className="h-7 w-7" />
              </span>
              <div className="max-w-lg">
                <span className="text-xs font-bold uppercase tracking-wider text-accent-600">
                  Step 1
                </span>
                <h3 className="mt-1 text-xl font-extrabold text-[var(--text-primary)] sm:text-2xl">
                  {STEPS[0].title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                  {STEPS[0].body}
                </p>
              </div>
            </div>
            {/* Decorative accent orb */}
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-[0.08] transition-opacity duration-500 group-hover:opacity-[0.15]"
              style={{ background: 'var(--brand-gradient)' }}
              aria-hidden
            />
          </div>
        </Reveal>

        {/* Steps 2 & 3 */}
        {STEPS.slice(1).map((step, i) => {
          const Icon = step.icon
          return (
            <Reveal key={step.title} delay={(i + 1) * 120}>
              <div
                className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-surface p-7 sm:p-8"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-accent-500 group-hover:text-[#1a2332]">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="mt-5 block text-xs font-bold uppercase tracking-wider text-accent-600">
                  Step {i + 2}
                </span>
                <h3 className="mt-1 text-lg font-extrabold text-[var(--text-primary)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {step.body}
                </p>

                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span>Learn more</span>
                  <ArrowRight className="h-3 w-3" />
                </div>

                {/* Decorative */}
                <div
                  className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full opacity-[0.06] transition-opacity duration-500 group-hover:opacity-[0.12]"
                  style={{ background: 'var(--brand-gradient)' }}
                  aria-hidden
                />
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
