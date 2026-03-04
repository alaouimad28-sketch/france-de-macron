'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  once?: boolean
}

export function ScrollReveal({ children, className, once = true }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return

    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [once])

  return (
    <div
      ref={ref}
      className={[
        'motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out',
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 motion-reduce:opacity-100 motion-reduce:translate-y-0',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </div>
  )
}
