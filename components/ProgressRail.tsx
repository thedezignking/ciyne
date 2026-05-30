'use client'

import { FileText, PenLine, MousePointer2, Check } from 'lucide-react'
import type { AppStep } from '@/types'

const STEPS = [
  { id: 1 as AppStep, label: 'Upload PDF', icon: FileText },
  { id: 2 as AppStep, label: 'Signature', icon: PenLine },
  { id: 3 as AppStep, label: 'Place & sign', icon: MousePointer2 },
]

type ProgressRailProps = {
  current: AppStep
  maxReached: AppStep
  onStepClick?: (step: AppStep) => void
}

/**
 * Horizontal progress stepper for focus mode: numbered nodes connected by a
 * track that fills with the brand accent as the user advances.
 */
export default function ProgressRail({ current, maxReached, onStepClick }: ProgressRailProps) {
  // Fill the connector track up to the current step.
  const fillPct = ((current - 1) / (STEPS.length - 1)) * 100

  return (
    <nav aria-label="Progress" className="px-1">
      <div className="relative">
        {/* Track sits behind the nodes, spanning between the first and last node center */}
        <div className="absolute left-0 right-0 top-5 mx-[12.5%] h-1 rounded-full bg-[var(--step-inactive)]" />
        <div
          className="absolute left-0 top-5 mx-[12.5%] h-1 rounded-full bg-accent-500 transition-[width] duration-500 ease-out"
          style={{ width: `calc((100% - 25%) * ${fillPct / 100})` }}
        />

        <ol className="relative flex items-start justify-between">
          {STEPS.map((step) => {
            const Icon = step.icon
            const isActive = step.id === current
            const isComplete = step.id < current
            const isReachable = step.id <= maxReached

            return (
              <li key={step.id} className="flex flex-1 flex-col items-center gap-2">
                <button
                  type="button"
                  disabled={!isReachable || !onStepClick}
                  onClick={() => onStepClick?.(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 bg-surface transition-all duration-300 ${
                    isActive
                      ? 'scale-110 border-accent-500 text-[#1a2332] shadow-[0_4px_14px_rgba(132,204,22,0.4)]'
                      : isComplete
                        ? 'border-accent-500 text-accent-600'
                        : 'border-[var(--step-inactive)] text-[var(--text-muted)]'
                  } ${
                    isReachable && onStepClick && !isActive
                      ? 'cursor-pointer hover:border-accent-500/60'
                      : 'cursor-default'
                  }`}
                  style={isActive ? { background: 'var(--accent-500)' } : undefined}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5 stroke-[2.5]" aria-hidden />
                  ) : (
                    <Icon className="h-5 w-5" aria-hidden />
                  )}
                </button>
                <span
                  className={`text-center text-xs font-semibold transition-colors ${
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : isComplete
                        ? 'text-accent-600'
                        : 'text-[var(--text-muted)]'
                  }`}
                >
                  {step.label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
