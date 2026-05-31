'use client'

import { FileText, PenLine, MousePointer2, Check } from 'lucide-react'
import type { AppStep } from '@/types'

const STEPS = [
  { id: 1 as AppStep, label: 'Upload PDF', hint: 'Choose your document', icon: FileText },
  { id: 2 as AppStep, label: 'Your signature', hint: 'Upload or draw', icon: PenLine },
  { id: 3 as AppStep, label: 'Place & download', hint: 'Drag to position', icon: MousePointer2 },
]

type StepNavProps = {
  current: AppStep
  maxReached: AppStep
  onStepClick?: (step: AppStep) => void
}

export default function StepNav({ current, maxReached, onStepClick }: StepNavProps) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Progress">
      {STEPS.map((step, idx) => {
        const Icon = step.icon
        const isActive = step.id === current
        const isComplete = step.id < current
        const isReachable = step.id <= maxReached

        return (
          <button
            key={step.id}
            type="button"
            disabled={!isReachable || !onStepClick}
            onClick={() => onStepClick?.(step.id)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
              isActive
                ? 'bg-accent-50 ring-1 ring-accent-500/20'
                : isReachable
                  ? 'hover:bg-white/80'
                  : 'opacity-40'
            } ${isReachable && onStepClick ? 'cursor-pointer' : 'cursor-default'}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <span
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                isActive
                  ? 'bg-accent-600 text-white shadow-sm'
                  : isComplete
                    ? 'bg-accent-500/15 text-accent-600'
                    : 'bg-[var(--step-inactive)] text-[var(--text-muted)]'
              }`}
            >
              {isComplete ? (
                <Check className="h-4 w-4 stroke-[2.5]" aria-hidden />
              ) : (
                <Icon className="h-4 w-4" aria-hidden />
              )}
              {isActive && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent-600 ring-2 ring-white" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm font-semibold leading-tight ${
                  isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {step.label}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                {isComplete ? 'Done' : step.hint}
              </span>
            </span>
            <span
              className={`text-xs font-medium tabular-nums ${
                isActive ? 'text-accent-600' : 'text-[var(--text-muted)]'
              }`}
            >
              {idx + 1}/{STEPS.length}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
