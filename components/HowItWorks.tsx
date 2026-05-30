import { Upload, PenTool, Download } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from '@/components/Reveal'

type Step = {
  icon: LucideIcon
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: Upload,
    title: 'Upload your PDF',
    body: 'Drop in any PDF up to 20 MB. Navigate through every page to find exactly where you need to sign.',
  },
  {
    icon: PenTool,
    title: 'Create your signature',
    body: 'Draw it freehand, type it in a handwriting font, or photograph your ink signature. Background removal is automatic.',
  },
  {
    icon: Download,
    title: 'Place and download',
    body: 'Drag your signature onto any page. Resize to fit. Download the signed PDF at original quality.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-6">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          {/* Left — heading */}
          <Reveal>
            <div className="lg:sticky lg:top-24">
              <span className="text-sm font-semibold tracking-wide text-accent-600">
                How it works
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Three steps, under two minutes.
              </h2>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-[var(--text-secondary)]">
                No account, no setup, no tutorial. Upload, sign, and download the finished file.
              </p>
            </div>
          </Reveal>

          {/* Right — vertical timeline */}
          <ol className="relative">
            {/* Connector line running through the icon centers */}
            <span
              className="absolute left-[27px] top-7 bottom-7 w-px bg-border"
              aria-hidden
            />

            {STEPS.map((step, i) => {
              const Icon = step.icon
              const isLast = i === STEPS.length - 1
              return (
                <Reveal as="li" key={step.title} delay={i * 120}>
                  <div className={`group relative flex gap-5 ${isLast ? '' : 'pb-10'}`}>
                    {/* Icon node */}
                    <span className="relative z-10 flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-accent-600 shadow-sm transition-all duration-200 group-hover:border-accent-500/50 group-hover:bg-accent-50">
                      <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
                    </span>

                    {/* Text */}
                    <div className="pt-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold uppercase tracking-widest text-accent-600">
                          Step {String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-lg font-bold text-[var(--text-primary)]">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
