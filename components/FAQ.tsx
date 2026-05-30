'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import Reveal from '@/components/Reveal'

const ITEMS = [
  {
    q: 'Is Ciyne really free?',
    a: 'Yes — completely free with no hidden fees, no trials, and no per-document charges. Sign as many PDFs as you need.',
  },
  {
    q: 'Do you store my documents?',
    a: 'No. Your PDF and signature never leave your browser. All processing happens locally. We don\'t upload, store, or see your files.',
  },
  {
    q: 'What file types can I use for my signature?',
    a: 'You can draw your signature directly, type it with a handwriting font, or upload a photo (JPG, PNG, or WEBP). Ciyne automatically removes the paper background from photos.',
  },
  {
    q: 'Is the signed PDF legally valid?',
    a: 'Ciyne places a visual signature image on your PDF — the same as printing, signing by hand, and scanning. For most everyday documents, this is fully accepted.',
  },
  {
    q: 'What\'s the maximum file size?',
    a: 'You can upload PDFs up to 20 MB. Since everything runs in your browser, larger files may take a moment to render.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <Reveal className="max-w-2xl">
          <span className="text-sm font-semibold text-accent-600">FAQ</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Common questions
          </h2>
        </Reveal>

        <div className="mt-10 max-w-3xl">
          {ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <Reveal key={i} delay={i * 60}>
                <div className="border-b border-border/60">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full items-center justify-between gap-4 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-semibold text-[var(--text-primary)] transition-colors group-hover:text-accent-600 sm:text-base">
                      {item.q}
                    </span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/80 text-[var(--text-muted)] transition-colors group-hover:border-accent-500/40 group-hover:text-accent-600">
                      {isOpen ? (
                        <Minus className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
