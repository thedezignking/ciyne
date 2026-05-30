import Reveal from '@/components/Reveal'

const POINTS = [
  {
    n: '01',
    title: 'No account',
    body: 'Skip the sign-up wall. Open the page and start signing immediately — no email, no password, no waiting.',
  },
  {
    n: '02',
    title: 'No watermark',
    body: 'Your signed PDF comes out clean. No logo, no branding, no fine print stamped across your document.',
  },
  {
    n: '03',
    title: 'Original quality',
    body: 'Your signature is placed on the original file. No re-compression, no resolution loss, no blurry pages.',
  },
  {
    n: '04',
    title: 'Free, unlimited',
    body: 'Sign as many documents as you need. No trials, no per-document fees, no premium tier.',
  },
]

export default function WhyCiyne() {
  return (
    <section id="why" className="scroll-mt-6">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        {/* Header — split layout matching HowItWorks */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold tabular-nums text-accent-600">
                02
              </span>
              <span className="text-sm font-medium text-[var(--text-muted)]">Principles</span>
            </div>
            <h2 className="mt-5 text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)]">
              Why Ciyne
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--text-secondary)] sm:text-right">
              Most signing tools want your email before they want to help. Ciyne just signs the PDF.
            </p>
          </Reveal>
        </div>

        {/* Two-column staggered grid */}
        <div className="stagger-grid mt-20 grid grid-cols-1 gap-x-16 gap-y-16 sm:grid-cols-2">
          {POINTS.map((p, i) => (
            <Reveal
              key={p.n}
              delay={i * 100}
            >
              <div className="group">
                <span className="inline-flex items-center justify-center rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold tabular-nums text-accent-600 transition-colors duration-300 group-hover:bg-accent-500 group-hover:text-[#1a2332]">
                  {p.n}
                </span>
                <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                  {p.title}
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
