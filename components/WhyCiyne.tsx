import Reveal from '@/components/Reveal'

const POINTS = [
  {
    title: 'No account needed',
    body: 'Skip the sign-up wall. Open the page and start signing immediately.',
  },
  {
    title: 'No watermark',
    body: 'Your signed PDF comes out clean. No logo stamped across your document.',
  },
  {
    title: 'Original quality',
    body: 'Your signature is placed on the original file. No re-compression, no blurry pages.',
  },
  {
    title: 'Free, unlimited',
    body: 'Sign as many documents as you need. No trials, no per-document fees, no catches.',
  },
]

export default function WhyCiyne() {
  return (
    <section id="why" className="scroll-mt-6 border-t border-border/60">
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

        <div className="mt-14 grid gap-x-16 gap-y-10 sm:grid-cols-2">
          {POINTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <div className="group">
                <div className="mb-4 h-px w-10 bg-accent-500/50 transition-all duration-300 group-hover:w-16 group-hover:bg-accent-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
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
