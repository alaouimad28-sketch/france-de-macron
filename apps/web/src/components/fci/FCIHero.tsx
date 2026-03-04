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
        id="hero"
        aria-label="French Cooked Index"
        className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-4 py-20"
      >
        <p className="text-center text-sm text-surface-600">Données indisponibles pour le moment.</p>
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
      id="hero"
      aria-label="French Cooked Index"
      className="relative scroll-mt-24 overflow-hidden py-[15px]"
    >
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center justify-center overflow-hidden px-4 py-0 text-center md:py-0">

        {/* Eyebrow chip */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white px-4 py-1.5 shadow-sm">
          <span className="font-mono text-xs tracking-widest text-surface-600 uppercase">
            French Cooked Index™
          </span>
        </div>

        {/* Titre */}
        <h1 className="mb-8 ml-4 font-display text-4xl font-black leading-tight tracking-tight text-surface-900 sm:text-5xl md:text-6xl">
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
        <p className="mb-2 font-display text-2xl font-bold" style={{ color: scoreColor }}>
          {fciLabel}
        </p>

        {/* Tagline */}
        <p className="mb-5 max-w-sm font-body text-base text-surface-600">{tagline}</p>

        {/* Date de mise à jour */}
        <p className="mb-10 font-mono text-xs text-surface-600">
          Mis à jour le {formattedDate}
        </p>

        {/* CTA scroll */}
        <a
          href="#carburants"
          aria-label="Voir les données carburants"
          className="flex flex-col items-center gap-1 text-xs text-surface-600 transition-colors hover:text-surface-900"
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
