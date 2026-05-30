'use client'

import { Check } from 'lucide-react'

/**
 * Hero visual: a fanned stack of PDF document cards with a handwritten
 * signature being placed on the front page. Tells the product story
 * (drop your signature onto any PDF) without generic stock illustration.
 * Pure CSS/SVG, no assets.
 */

function WindowChrome({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-black/5 px-3.5 py-2.5">
      <span className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </span>
      <span className="ml-1 truncate text-[11px] font-medium text-[var(--text-muted)]">{name}</span>
    </div>
  )
}

function TextLines({ rows }: { rows: number[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((w, i) => (
        <span
          key={i}
          className="block h-2 rounded-full bg-[#eef1f4]"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  )
}

export default function HeroDocStack() {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[520px] select-none" aria-hidden>
      {/* Back card */}
      <div
        className="float-doc absolute left-[6%] top-[14%] w-[52%] origin-bottom overflow-hidden rounded-2xl border border-black/5 bg-white"
        style={{ ['--doc-rot' as string]: '-9deg', boxShadow: 'var(--shadow-doc)', animationDelay: '0.6s' }}
      >
        <WindowChrome name="lease-agreement.pdf" />
        <div className="px-4 py-4">
          <TextLines rows={[80, 95, 70, 90, 60]} />
        </div>
      </div>

      {/* Right card */}
      <div
        className="float-doc absolute right-[4%] top-[8%] w-[50%] origin-bottom overflow-hidden rounded-2xl border border-black/5 bg-white"
        style={{ ['--doc-rot' as string]: '8deg', boxShadow: 'var(--shadow-doc)', animationDelay: '1.4s' }}
      >
        <WindowChrome name="nda.pdf" />
        <div className="px-4 py-4">
          <TextLines rows={[70, 88, 95, 65]} />
        </div>
      </div>

      {/* Front card — the one being signed */}
      <div
        className="float-doc absolute bottom-0 left-1/2 w-[62%] -translate-x-1/2 overflow-hidden rounded-2xl border border-black/5 bg-white"
        style={{ ['--doc-rot' as string]: '0deg', boxShadow: 'var(--shadow-float)' }}
      >
        <WindowChrome name="contract.pdf" />
        <div className="px-5 pb-7 pt-5">
          <TextLines rows={[92, 78, 88, 64]} />

          {/* Signature field */}
          <div className="relative mt-6">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Signature
            </span>
            {/* Selection box around the placed signature */}
            <div className="relative mt-1 rounded-lg ring-2 ring-accent-500/70">
              <svg viewBox="0 0 220 70" className="h-14 w-full" fill="none">
                <path
                  className="sig-path"
                  d="M8 46c10-22 17-30 22-28 6 2-6 34-2 38 5 5 16-30 22-30 5 0-3 24 1 26 5 3 14-20 21-20 6 0 0 16 4 17 6 2 13-9 18-15 9-10 18-16 28-16 13 0 9 14 22 14 11 0 26-12 40-24"
                  stroke="#1a2332"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 1,
                    animation: 'draw-sig 1.8s var(--ease-out-expo) 0.9s forwards',
                  }}
                />
              </svg>
              {/* corner handles */}
              {['-left-1 -top-1', '-right-1 -top-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map(
                (pos) => (
                  <span
                    key={pos}
                    className={`absolute ${pos} h-2.5 w-2.5 rounded-full border-2 border-accent-500 bg-white`}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating "Signed" pill */}
      <div
        className="animate-rise absolute -right-1 bottom-[18%] flex items-center gap-1.5 rounded-full bg-[#1a2332] px-3 py-1.5 text-xs font-semibold text-white shadow-lg sm:-right-2"
        style={{ animationDelay: '2.4s', boxShadow: 'var(--shadow-float)' }}
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-[#1a2332]">
          <Check className="h-3 w-3 stroke-[3]" />
        </span>
        Signed
      </div>
    </div>
  )
}
