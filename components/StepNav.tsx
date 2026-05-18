'use client'

import { FileText, PenLine, MousePointer2 } from 'lucide-react'
import type { AppStep } from '@/types'

const STEPS = [
  { id: 1 as AppStep, label: 'Upload PDF', icon: FileText },
  { id: 2 as AppStep, label: 'Your signature', icon: PenLine },
  { id: 3 as AppStep, label: 'Place & download', icon: MousePointer2 },
]

type StepNavProps = {
  current: AppStep
  maxReached: AppStep
  onStepClick?: (step: AppStep) => void
}

export default function StepNav({ current, maxReached, onStepClick }: StepNavProps) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Progress">
      {STEPS.map((step) => {
        const Icon = step.icon
        const isActive = step.id === current
        const isComplete = step.id < current
        const isReachable = step.id <= maxReached
        const barClass = isActive
          ? 'bg-accent-500'
          : isComplete
            ? 'bg-accent-400'
            : 'bg-[var(--step-inactive)]'

        return (
          <button
            key={step.id}
            type="button"
            disabled={!isReachable || !onStepClick}
            onClick={() => onStepClick?.(step.id)}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
              isActive ? 'bg-accent-50' : isReachable ? 'hover:bg-white/80' : 'opacity-50'
            } ${isReachable && onStepClick ? 'cursor-pointer' : 'cursor-default'}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                isActive
                  ? 'border-accent-500 bg-accent-50 text-accent-600'
                  : isComplete
                    ? 'border-accent-400 bg-accent-50 text-accent-600'
                    : 'border-border bg-surface text-muted'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm font-semibold ${
                  isActive ? 'text-primary' : 'text-secondary'
                }`}
              >
                {step.label}
              </span>
              <span className="mt-1 flex gap-1">
                <span className={`h-1 w-8 rounded-full ${barClass}`} />
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
