import { FileText, PenLine, MousePointer2 } from 'lucide-react'
import Reveal from '@/components/Reveal'

const STEPS = [
  {
    icon: FileText,
    title: 'Upload your PDF',
    body: 'Drop in any PDF up to 20 MB. We render the first page so you can see exactly what you are signing.',
  },
  {
    icon: PenLine,
    title: 'Add your signature',
    body: 'Snap a photo of your handwritten signature. Ciyne removes the paper background automatically.',
  },
  {
    icon: MousePointer2,
    title: 'Place & download',
    body: 'Drag your signature to the right spot, resize it, and download the signed PDF in full quality.',
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

      <ol className="mt-12 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <Reveal as="li" key={step.title} delay={i * 120}>
              <div
                className="lift group relative h-full rounded-2xl border border-border bg-surface p-6"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-accent-500 group-hover:text-[#1a2332]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-5 block text-sm font-bold tabular-nums text-[var(--text-muted)]">
                  Step {i + 1}
                </span>
                <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {step.body}
                </p>
              </div>
            </Reveal>
          )
        })}
      </ol>
    </section>
  )
}
