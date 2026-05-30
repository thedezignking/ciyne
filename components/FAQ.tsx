import Reveal from '@/components/Reveal'

const ITEMS = [
  {
    q: 'Is Ciyne really free?',
    a: 'Yes — completely free with no hidden fees, no trials, and no per-document charges. Sign as many PDFs as you need.',
  },
  {
    q: 'Do you store my documents?',
    a: 'No. Your PDF and signature never leave your browser. All processing happens locally — we never see your files.',
  },
  {
    q: 'What signature formats work?',
    a: 'Draw directly, type with a handwriting font, or upload a photo (JPG, PNG, WEBP). Ciyne removes the paper background from photos automatically.',
  },
  {
    q: 'Is the signed PDF legally valid?',
    a: 'Ciyne places a visual signature — the same as printing, signing by hand, and scanning. Fully accepted for most everyday documents.',
  },
  {
    q: 'What\'s the maximum file size?',
    a: 'PDFs up to 20 MB. Everything runs in your browser, so larger files may take a moment to render.',
  },
  {
    q: 'Can I sign multiple pages?',
    a: 'Yes. Navigate to any page in the document, drag your signature into position, and download the signed PDF.',
  },
]

export default function FAQ() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        {/* Header — split layout */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold tabular-nums text-accent-600">
                03
              </span>
              <span className="text-sm font-medium text-[var(--text-muted)]">FAQ</span>
            </div>
            <h2 className="mt-5 text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)]">
              Questions
            </h2>
          </Reveal>
        </div>

        {/* Open two-column grid — no accordion */}
        <div className="mt-16 grid grid-cols-1 gap-x-16 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <Reveal key={i} delay={i * 80}>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] sm:text-base">
                  {item.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {item.a}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
