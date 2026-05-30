import Reveal from '@/components/Reveal'

const STEPS = [
  {
    n: '01',
    title: 'Upload',
    items: ['Any PDF up to 20 MB', 'Full page preview', 'Multi-page navigation'],
  },
  {
    n: '02',
    title: 'Sign',
    items: ['Draw, type, or snap a photo', 'Auto background removal', 'Three handwriting styles'],
  },
  {
    n: '03',
    title: 'Download',
    items: ['Drag to position on any page', 'Resize to fit', 'Full quality output'],
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-6 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        {/* Header — split layout */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold tabular-nums text-accent-600">
                01
              </span>
              <span className="text-sm font-medium text-[var(--text-muted)]">Process</span>
            </div>
            <h2 className="mt-5 text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)]">
              How it works
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--text-secondary)] sm:text-right">
              No account needed. Upload, sign, and download — all in under two minutes.
            </p>
          </Reveal>
        </div>

        {/* Staircase — ascending steps */}
        <div className="staircase mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, i) => (
            <Reveal
              key={step.n}
              delay={i * 150}
            >
              <div className="group">
                {/* Pill */}
                <span className="inline-flex items-center justify-center rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold tabular-nums text-accent-600 transition-colors duration-300 group-hover:bg-accent-500 group-hover:text-[#1a2332]">
                  Step {step.n}
                </span>

                {/* Title */}
                <h3 className="mt-4 text-[clamp(1.5rem,3vw,2.25rem)] font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)]">
                  {step.title}
                </h3>

                {/* Description items */}
                <ul className="mt-4 space-y-2">
                  {step.items.map((item) => (
                    <li
                      key={item}
                      className="text-sm leading-relaxed text-[var(--text-secondary)]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Decorative bar — echoes the reference wave with our accent */}
        <Reveal delay={500}>
          <div className="mt-20 flex gap-1.5 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="h-10 flex-1 rounded-full sm:h-12"
                style={{
                  background: 'var(--brand-gradient)',
                  opacity: 0.12 + (i / 18) * 0.25,
                }}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
