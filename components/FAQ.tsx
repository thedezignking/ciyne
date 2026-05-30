'use client'

import { useState } from 'react'
import Reveal from '@/components/Reveal'

const ITEMS = [
  {
    q: 'Is Ciyne really free?',
    a: 'Completely free. No hidden fees, no trials, no per-document charges.',
  },
  {
    q: 'Do you store my documents?',
    a: 'No. Your PDF and signature stay in your browser. Nothing is uploaded to a server.',
  },
  {
    q: 'What signature formats work?',
    a: 'Draw freehand, type with a handwriting font, or upload a photo (JPG, PNG, WEBP). Background removal is automatic for photos.',
  },
  {
    q: 'Is the signed PDF legally valid?',
    a: 'Ciyne places a visual signature, the same as printing, signing by hand, and scanning back in. Accepted for most everyday documents.',
  },
  {
    q: 'What\'s the file size limit?',
    a: 'PDFs up to 20 MB. Processing runs entirely in your browser.',
  },
  {
    q: 'Can I sign on a specific page?',
    a: 'Yes. Navigate to any page in the document, position your signature, and download.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="border-t border-border/50">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
          {/* Left — heading */}
          <Reveal>
            <div className="lg:sticky lg:top-24">
              <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Common questions
              </h2>
              <p className="mt-3 max-w-sm text-base leading-relaxed text-[var(--text-secondary)]">
                Everything runs in your browser. No data leaves your device.
              </p>
            </div>
          </Reveal>

          {/* Right — accordion */}
          <div>
            {ITEMS.map((item, i) => {
              const isOpen = openIndex === i
              return (
                <Reveal key={i} delay={i * 50}>
                  <div className={`border-b border-border/50 ${i === 0 ? 'border-t' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      className="flex w-full items-baseline justify-between gap-6 py-5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-semibold text-[var(--text-primary)] sm:text-[15px]">
                        {item.q}
                      </span>
                      <span
                        className="shrink-0 text-xs font-medium text-[var(--text-muted)] transition-colors"
                        aria-hidden
                      >
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>
                    <div
                      className={`grid transition-all duration-300 ease-out ${
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
      </div>
    </section>
  )
}
