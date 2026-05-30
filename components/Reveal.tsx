'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  /** Delay in ms before the reveal transition runs (used for staggering). */
  delay?: number
  /** Wrapper element tag. Defaults to a div. */
  as?: 'div' | 'li' | 'section'
  className?: string
  style?: React.CSSProperties
}

/**
 * Reveals its children with a rise+fade the first time they scroll into view.
 * Uses IntersectionObserver (no dependencies). Honors prefers-reduced-motion by
 * rendering visible immediately. SSR-safe: starts hidden only on the client.
 */
export default function Reveal({
  children,
  delay = 0,
  as = 'div',
  className = '',
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            observer.disconnect()
            break
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const Tag = as as 'div'

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      data-reveal
      data-shown={shown ? 'true' : 'false'}
      style={{ ...style, transitionDelay: `${delay}ms` }}
      className={className}
    >
      {children}
    </Tag>
  )
}
