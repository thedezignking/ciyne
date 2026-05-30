import Reveal from '@/components/Reveal'

const STEPS = [
  {
    n: '01',
    title: 'Upload your PDF',
    body: 'Drop in any PDF up to 20 MB. We render every page so you can see exactly what you are signing.',
  },
  {
    n: '02',
    title: 'Add your signature',
    body: 'Draw it, type it, or snap a photo. Ciyne removes the paper background automatically.',
  },
  {
    n: '03',
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

      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border/80 bg-border/40 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.n} delay={i * 100}>
            <div className="group flex h-full flex-col bg-surface p-7 transition-colors duration-300 hover:bg-accent-50/30 sm:p-8">
              <span className="text-[2.5rem] font-extrabold leading-none tracking-tight text-accent-500/25 transition-colors duration-300 group-hover:text-accent-500/50">
                {step.n}
              </span>
              <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
                {step.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                {step.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
