/**
 * FCIHero — Section hero avec jauge FCI (Server Component)
 *
 * Aesthetic "Cooked Authority" light : fond blanc, dégradé tricolore subtil
 * en arrière-plan, titre punchy, jauge semicirculaire.
 */

import { createReadClient } from '@/lib/supabase/server'
import { getFCILabel, getFCIScoreColor } from '@/lib/utils'
import { FCIGauge } from './FCIGauge'

function getTagline(score: number): string {
  if (score < 25) return 'La vie est belle, les pompes aussi.'
  if (score < 50) return 'Ça commence à chauffer côté portefeuille.'
  if (score < 75) return 'Les données confirment ce que tu ressens à la pompe.'
  return 'Les données ne mentent pas. On est cooked.'
}

export async function FCIHero() {
  const supabase = await createReadClient()

  const { data: rawData, error } = await supabase
    .from('fci_daily')
    .select('day, score')
    .order('day', { ascending: false })
    .limit(2)

  // Type assertion — createServerClient@0.5.1 resolves select result as never[] due to
  // a mismatch with the manually written database.types.ts. Regenerate types with db:types to fix.
  const data = rawData as Array<{ day: string; score: number }> | null

  if (error || !data || data.length === 0) {
    return (
      <section
        id="fci"
        aria-labelledby="fci-heading"
        className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-4 py-20"
      >
        <h1 id="fci-heading" className="sr-only">
          French Cooked Index
        </h1>
        <p className="text-surface-600 text-center text-sm">
          Données indisponibles pour le moment.
        </p>
      </section>
    )
  }

  const latest = data[0]!
  const previousScore = data[1]?.score
  const tagline = getTagline(latest.score)
  const scoreColor = getFCIScoreColor(latest.score)
  const { label: fciLabel } = getFCILabel(latest.score)

  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(latest.day))

  return (
    <section
      id="fci"
      aria-labelledby="fci-heading"
      className="relative scroll-mt-24 overflow-hidden py-12 md:py-16"
    >
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center justify-center overflow-hidden px-4 py-0 text-center md:py-0">
        {/* Eyebrow chip */}
        <div className="border-surface-200 mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 shadow-sm">
          <span className="text-surface-600 font-mono text-xs uppercase tracking-widest">
            French Cooked Index™
          </span>
        </div>

        {/* Titre */}
        <h1
          id="fci-heading"
          className="font-display text-surface-900 mb-8 ml-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl"
        >
          Dans la France de Macron...
          <br />
          <span style={{ color: scoreColor }}>on est cooked ?</span>
        </h1>

        {/* Jauge */}
        <div className="mb-2 w-full">
          <FCIGauge
            score={latest.score}
            {...(previousScore !== undefined ? { previousScore } : {})}
            updatedAt={latest.day}
          />
        </div>

        {/* Label FCI */}
        <p className="font-display mb-2 text-2xl font-bold" style={{ color: scoreColor }}>
          {fciLabel}
        </p>

        {/* Tagline */}
        <p className="font-body text-surface-600 mb-5 max-w-sm text-base">{tagline}</p>

        {/* Date de mise à jour */}
        <p className="text-surface-600 mb-10 font-mono text-xs">Mis à jour le {formattedDate}</p>

        {/* CTA scroll */}
        <a
          href="#carburants"
          aria-label="Voir les données carburants"
          className="text-surface-600 hover:text-surface-900 flex flex-col items-center gap-1 text-xs transition-colors"
        >
          <span>Voir les données</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className="animate-bounce"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </a>
      </div>
    </section>
  )
}
