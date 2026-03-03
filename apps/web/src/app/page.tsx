/**
 * Home page — Server Component (SSR)
 *
 * Assemble les 4 sections : FCIHero, FuelSection, CookedVote, NewsletterForm.
 * Les fetches Supabase sont effectués dans les Server Components enfants
 * (FCIHero et FuelSection) directement — pas de waterfall.
 */

import { FCIHero } from '@/components/fci/FCIHero'
import { FuelSection } from '@/components/fuel/FuelSection'
import { CookedVote } from '@/components/vote/CookedVote'
import { NewsletterForm } from '@/components/newsletter/NewsletterForm'

const PAGE_GRADIENT =
  'linear-gradient(to right, rgba(35,85,238,0.35) 0%, rgba(255,255,255,0.95) 38%, rgba(255,255,255,0.95) 62%, rgba(244,63,94,0.35) 100%)'

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: PAGE_GRADIENT }}>
      {/* Hero FCI */}
      <FCIHero />

      {/* Séparateur */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="h-px bg-[rgb(120,122,130)]" />
      </div>

      {/* Module carburants */}
      <FuelSection />

      {/* Séparateur */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="h-px bg-[rgb(120,122,130)]" />
      </div>

      {/* Vote cooked / uncooked */}
      <section
        id="vote"
        aria-label="Vote cooked / uncooked"
        className="px-4 py-[15px]"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 font-mono text-xs tracking-widest text-surface-600 uppercase">
            Ton avis
          </p>
          <h2 className="mb-3 font-display text-3xl font-bold text-surface-900">
            Toi, tu te sens comment ?
          </h2>
          <p className="mb-8 text-sm text-surface-600">
            Pas de compte. Pas de cookies. Juste un vote anonyme.
          </p>
          <CookedVote scope="global" />
        </div>
      </section>

      {/* Séparateur */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="h-px bg-[rgb(120,122,130)]" />
      </div>

      {/* Newsletter */}
      <section
        id="newsletter"
        aria-label="Inscription newsletter"
        className="px-4 py-[15px]"
      >
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-2 font-mono text-xs tracking-widest text-surface-600 uppercase">
            Reste informé
          </p>
          <h2 className="mb-3 font-display text-3xl font-bold text-surface-900">
            Le FCI dans ta boîte
          </h2>
          <p className="mb-8 text-base text-surface-600">
            Reçois le score chaque semaine — sans drama, sans spam,{' '}
            avec les données qui changent ta façon de voir les prix.
          </p>
          <NewsletterForm source="homepage-footer" />
        </div>
      </section>
    </div>
  )
}
