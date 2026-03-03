'use client'

/**
 * Header — Navigation sticky, fond blanc
 *
 * - Logo "France de Macron" (lien vers /)
 * - Nav : Accueil, À propos, Méthodologie
 * - Fond blanc ; disparaît au scroll down, réapparaît en glissant au scroll up
 */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/about', label: 'À propos' },
  { href: '/methodology', label: 'Méthodologie' },
]

const SCROLL_THRESHOLD = 60

export function Header() {
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      const prev = lastScrollY.current
      if (y <= 20) {
        setVisible(true)
      } else if (y > prev && y > SCROLL_THRESHOLD) {
        setVisible(false)
      } else if (y < prev) {
        setVisible(true)
      }
      lastScrollY.current = y
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={[
        'fixed top-0 z-50 w-full border-b border-surface-200 bg-white shadow-sm transition-transform duration-300 ease-out',
        visible ? 'translate-y-0' : '-translate-y-full',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2 transition-opacity hover:opacity-80"
          aria-label="France de Macron — Accueil"
        >
          <span className="text-lg" aria-hidden="true">🇫🇷</span>
          <span className="font-display text-sm font-bold tracking-tight text-surface-800 sm:text-base">
            France de Macron
          </span>
        </Link>

        {/* Navigation */}
        <nav aria-label="Navigation principale">
          <ul className="flex items-center gap-1 sm:gap-2">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 sm:text-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-republic-500',
                      isActive
                        ? 'bg-republic-50 text-republic-600'
                        : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900',
                    ].join(' ')}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
