/**
 * Footer — Server Component
 *
 * - Liens : À propos, Méthodologie, Disclaimer, Sources
 * - Copyright + disclaimer court
 */

import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/about', label: 'À propos' },
  { href: '/methodology', label: 'Méthodologie' },
  { href: '/disclaimer', label: 'Disclaimer' },
]

const currentYear = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="border-surface-200 bg-surface-100 border-t px-4 py-[15px] md:py-[15px]">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          {/* Brand */}
          <div>
            <p className="font-display text-surface-800 text-sm font-bold">
              <span aria-hidden="true">🇫🇷</span> France de Macron
            </p>
            <p className="text-surface-600 mt-0.5 text-xs">Dashboard satirique & data-driven</p>
          </div>

          {/* Nav links */}
          <nav aria-label="Liens du pied de page">
            <ul className="flex flex-wrap justify-center gap-4 sm:justify-end">
              {FOOTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-surface-600 hover:text-surface-900 text-xs transition-colors focus-visible:underline focus-visible:outline-none"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Disclaimer + copyright */}
        <div className="border-surface-200 text-surface-600 mt-6 border-t pt-6 text-center text-xs">
          <p>
            Données : open data officiel (roulez-eco.fr, data.gouv.fr). Projet satirique &amp;
            éducatif — pas d&apos;affiliation politique.
          </p>
          <p className="mt-1">
            &copy; {currentYear} France de Macron · &quot;On est cooked, mais au moins on a des
            données.&quot;
          </p>
        </div>
      </div>
    </footer>
  )
}
