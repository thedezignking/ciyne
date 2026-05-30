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
    <section
      id="how"
      className="scroll-mt-6"
      style={{ background: 'linear-gradient(180deg, var(--bg-page) 0%, #f3f4f6 100%)' }}
    >
      <div className="mx-auto max-w-5xl px-5 py-24 sm:px-8">
        {/* Centered heading */}
        <Reveal className="text-center">
          <span className="text-sm font-semibold tracking-wide text-accent-600">
            How it works
          </span>
          <h2 className="mx-auto mt-3 max-w-lg text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Three steps to{' '}
            <span className="italic text-accent-600">signing your PDF</span>
          </h2>
        </Reveal>

        {/* Timeline */}
        <div className="relative mt-20">
          {/* Connector line — sits behind the circles, desktop only */}
          <div
            className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-[44px] hidden h-px sm:block"
            style={{ background: 'linear-gradient(90deg, var(--accent-400), var(--accent-500))' }}
            aria-hidden
          />

          <ol className="relative grid grid-cols-1 gap-14 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <Reveal as="li" key={step.title} delay={i * 150} className="text-center">
                  <div className="group flex flex-col items-center">
                    {/* Large circle icon */}
                    <span className="relative z-10 flex h-[88px] w-[88px] items-center justify-center rounded-full border border-accent-500/30 bg-surface text-accent-600 shadow-sm transition-all duration-300 group-hover:border-accent-500 group-hover:shadow-md">
                      <Icon className="h-7 w-7" strokeWidth={1.5} aria-hidden />
                    </span>

                    {/* Step label */}
                    <span className="mt-6 text-xs font-bold uppercase tracking-widest text-accent-600">
                      Step {String(i + 1).padStart(2, '0')}
                    </span>

                    {/* Title */}
                    <h3 className="mt-2 text-lg font-bold text-[var(--text-primary)]">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="mx-auto mt-2 max-w-[280px] text-sm leading-relaxed text-[var(--text-secondary)]">
                      {step.body}
                    </p>
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
