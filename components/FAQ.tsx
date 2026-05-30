'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
      <Reveal className="max-w-2xl">
        <span className="text-sm font-semibold text-accent-600">FAQ</span>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          Common questions
        </h2>
      </Reveal>

      <div className="mt-10 mx-auto max-w-3xl divide-y divide-border/70">
        {ITEMS.map((item, i) => {
          const isOpen = open === i
          return (
            <Reveal key={i} delay={i * 60}>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="group flex w-full items-start justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-[var(--text-primary)] transition-colors group-hover:text-accent-600">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`mt-0.5 h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
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
    </section>
  )
}
