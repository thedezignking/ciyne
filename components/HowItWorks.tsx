import { Upload, PenTool, Download } from 'lucide-react'
import Reveal from '@/components/Reveal'

const STEPS = [
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
    <section id="how" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-24 sm:px-8">
      <Reveal>
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          How it works
        </h2>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-[var(--text-secondary)]">
          Three steps. No account, no setup, no tutorial. Just upload, sign, download.
        </p>
      </Reveal>

      <div className="mt-16">
        {/* Timeline connector — desktop only */}
        <div className="relative hidden sm:block">
          <div className="absolute left-0 right-0 top-5 h-px bg-border" aria-hidden />
        </div>

        <ol className="relative grid gap-12 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <Reveal as="li" key={step.title} delay={i * 120}>
                <div className="group">
                  {/* Icon + step indicator */}
                  <div className="relative mb-6 flex items-center gap-3">
                    <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-accent-600 transition-colors duration-200 group-hover:border-accent-500 group-hover:bg-accent-50">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-[var(--text-muted)]">
                      {i + 1} / 3
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
