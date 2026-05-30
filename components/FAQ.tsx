'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          {/* Left — heading */}
          <Reveal>
            <div className="lg:sticky lg:top-24">
              <span className="text-sm font-semibold tracking-wide text-accent-600">
                FAQ
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Common questions
              </h2>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-[var(--text-secondary)]">
                Everything runs in your browser. No data leaves your device.
              </p>
            </div>
          </Reveal>

          {/* Right — accordion */}
          <div className="rounded-2xl border border-border/70 bg-surface">
            {ITEMS.map((item, i) => {
              const isOpen = openIndex === i
              const isLast = i === ITEMS.length - 1
              return (
                <Reveal key={i} delay={i * 50}>
                  <div className={!isLast ? 'border-b border-border/50' : ''}>
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      className="group flex w-full items-center justify-between gap-6 px-6 py-5 text-left sm:px-7"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-semibold text-[var(--text-primary)] sm:text-[15px]">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-300 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        strokeWidth={2}
                        aria-hidden
                      />
                    </button>
                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="px-6 pb-5 text-sm leading-relaxed text-[var(--text-secondary)] sm:px-7">
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
