/**
 * Home page — Server Component (SSR)
 */

import { FCIHero } from '@/components/fci/FCIHero'
import { FoodInflationSection } from '@/components/food/FoodInflationSection'
import { FuelSection } from '@/components/fuel/FuelSection'
import { ScrollReveal } from '@/components/layout/ScrollReveal'
import { NewsletterForm } from '@/components/newsletter/NewsletterForm'
import { CookedVote } from '@/components/vote/CookedVote'
import { YouthUnemploymentSection } from '@/components/youth/YouthUnemploymentSection'

const PAGE_GRADIENT =
  'linear-gradient(to right, rgba(35,85,238,0.35) 0%, rgba(255,255,255,0.95) 38%, rgba(255,255,255,0.95) 62%, rgba(244,63,94,0.35) 100%)'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://france-de-macron.fr'

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'France de Macron',
  url: appUrl,
  description:
    'Dashboard satirique et data-driven pour suivre le French Cooked Index™ et les prix des carburants.',
  inLanguage: 'fr-FR',
}

const HOME_ANCHORS = [
  { href: '#fci', label: 'Indice FCI' },
  { href: '#carburants', label: 'Carburants' },
  { href: '#alimentation', label: 'Alimentation' },
  { href: '#jeunesse', label: 'Jeunesse' },
  { href: '#vote', label: 'Vote' },
  { href: '#newsletter', label: 'Newsletter' },
]

function SectionDivider() {
  return (
    <div className="mx-auto max-w-4xl px-4" aria-hidden="true">
      <div className="h-px bg-[rgb(120,122,130)]" />
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: PAGE_GRADIENT }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      <ScrollReveal>
        <FCIHero />
      </ScrollReveal>

      <nav
        aria-label="Navigation des modules de la page d'accueil"
        className="mx-auto mb-8 flex max-w-5xl flex-wrap items-center justify-center gap-2 px-4 md:mb-10"
      >
        {HOME_ANCHORS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="border-surface-200 text-surface-700 hover:bg-surface-100 focus-visible:ring-republic-500 rounded-full border bg-white px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            {item.label}
          </a>
        ))}
        <a
          href="/indicators"
          className="bg-republic-500 hover:bg-republic-400 focus-visible:ring-republic-500 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2"
        >
          Tous les indicateurs
        </a>
      </nav>

      <SectionDivider />
      <ScrollReveal>
        <FuelSection />
      </ScrollReveal>

      <SectionDivider />
      <ScrollReveal>
        <FoodInflationSection />
      </ScrollReveal>

      <SectionDivider />
      <ScrollReveal>
        <YouthUnemploymentSection />
      </ScrollReveal>

      <SectionDivider />
      <ScrollReveal>
        <section
          id="vote"
          aria-labelledby="vote-heading"
          className="scroll-mt-24 px-4 py-12 md:py-16"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-surface-600 mb-2 font-mono text-xs uppercase tracking-widest">
              Ton avis
            </p>
            <h2 id="vote-heading" className="font-display text-surface-900 mb-3 text-3xl font-bold">
              Toi, tu te sens comment ?
            </h2>
            <p className="text-surface-600 mb-8 text-sm">
              Pas de compte. Pas de cookies. Juste un vote anonyme.
            </p>
            <CookedVote scope="global" />
          </div>
        </section>
      </ScrollReveal>

      <SectionDivider />
      <ScrollReveal>
        <section
          id="newsletter"
          aria-labelledby="newsletter-heading"
          className="scroll-mt-24 px-4 py-12 md:py-16"
        >
          <div className="mx-auto max-w-xl text-center">
            <p className="text-surface-600 mb-2 font-mono text-xs uppercase tracking-widest">
              Reste informé
            </p>
            <h2
              id="newsletter-heading"
              className="font-display text-surface-900 mb-3 text-3xl font-bold"
            >
              Le FCI dans ta boîte
            </h2>
            <p className="text-surface-600 mb-8 text-base">
              Reçois le score chaque semaine — sans drama, sans spam, avec les données qui changent
              ta façon de voir les prix.
            </p>
            <NewsletterForm source="homepage-footer" />
          </div>
        </section>
      </ScrollReveal>
    </div>
  )
}
