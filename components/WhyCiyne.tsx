import { BadgeCheck, Droplet, Sparkles, Wallet } from 'lucide-react'

const POINTS = [
  {
    icon: Wallet,
    title: 'No account, ever',
    body: 'Skip the sign-up wall. Open the page and start signing immediately.',
  },
  {
    icon: Droplet,
    title: 'No watermark',
    body: 'Your signed PDF comes out clean. No Ciyne logo stamped across your document.',
  },
  {
    icon: BadgeCheck,
    title: 'Full quality',
    body: 'We place your signature on the original file. No re-compression, no blurry pages.',
  },
  {
    icon: Sparkles,
    title: 'Free, no limits',
    body: 'Sign as many documents as you need. No trials, no per-document fees.',
  },
]

export default function WhyCiyne() {
  return (
    <section id="why" className="scroll-mt-6 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold text-accent-600">Why Ciyne</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Built to get out of your way.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
            Most signing tools want your email before they want to help. Ciyne just signs the PDF.
          </p>
        </div>

        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2">
          {POINTS.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {p.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
