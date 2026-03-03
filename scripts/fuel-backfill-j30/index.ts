/**
 * Job : fuel-backfill-j30
 *
 * Backfill des 30 derniers jours de données carburant.
 * À lancer une seule fois après le déploiement initial.
 *
 * Usage :
 *   pnpm fuel:backfill
 *   FUEL_END_DATE=20241115 pnpm fuel:backfill  (pour backfill jusqu'à une date)
 *
 * Voir README.md pour l'algorithme complet et la gestion des erreurs.
 *
 * TODO : Implémenter le pipeline complet
 */

// ---------------------------------------------------------------------------
// Types d'interface (spec — pas encore implémenté)
// ---------------------------------------------------------------------------

/** Résultat d'ingestion pour un jour/carburant */
interface DayIngestionResult {
  day: string           // "YYYY-MM-DD"
  fuelCode: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  sampleCount: number
  status: 'success' | 'skipped' | 'error'
  error?: string
}

/** Résumé du backfill complet */
interface BackfillSummary {
  daysProcessed: number
  daysSkipped: number
  daysErrored: number
  fuelAggregatesUpserted: number
  fciDaysCalculated: number
  durationMs: number
}

// ---------------------------------------------------------------------------
// Interface du pipeline d'ingestion (contrat à implémenter)
// ---------------------------------------------------------------------------

/**
 * Télécharge et décompresse le ZIP d'un jour depuis l'API officielle.
 *
 * URL format : /opendata/jour/YYYYMMDD
 * Retourne le contenu XML brut.
 *
 * TODO: implémenter avec node-fetch + adm-zip ou yauzl
 */
async function downloadDayXml(date: Date): Promise<string> {
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '')
  const baseUrl = process.env['FUEL_API_BASE_URL'] ?? 'https://donnees.roulez-eco.fr/opendata'
  const url = `${baseUrl}/jour/${yyyymmdd}`

  // TODO: fetch + unzip + return XML string
  throw new Error(`downloadDayXml(${url}) : non implémenté`)
}

/**
 * Parse le XML source et retourne les agrégats par carburant.
 *
 * Règles de parsing : voir README.md
 * TODO: implémenter avec fast-xml-parser
 */
async function parseAndAggregate(
  _xml: string,
  _day: Date,
): Promise<DayIngestionResult[]> {
  throw new Error('parseAndAggregate : non implémenté')
}

/**
 * Upsert les agrégats dans fuel_daily_agg.
 * Idempotent : ON CONFLICT (day, fuel_code) DO UPDATE.
 *
 * TODO: implémenter avec createClient() de @supabase/supabase-js
 */
async function upsertAggregates(_results: DayIngestionResult[]): Promise<void> {
  throw new Error('upsertAggregates : non implémenté')
}

/**
 * Calcule et upsert le score FCI pour une date donnée.
 *
 * TODO: implémenter le calcul v1 (fuel stress score)
 * Voir docs/data/methodology.md
 */
async function calcAndUpsertFCI(_day: Date): Promise<void> {
  throw new Error('calcAndUpsertFCI : non implémenté')
}

// ---------------------------------------------------------------------------
// Point d'entrée principal
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.warn('[fuel-backfill-j30] PLACEHOLDER — non implémenté')
  console.warn('Voir scripts/fuel-backfill-j30/README.md pour la spec complète.')

  const today = new Date()
  const days: Date[] = []

  for (let i = 1; i <= 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push(d)
  }

  console.warn(`Jours à traiter : ${days.length} (${days[days.length - 1]?.toISOString().slice(0, 10)} → ${days[0]?.toISOString().slice(0, 10)})`)

  // TODO: boucle d'ingestion + gestion erreurs + retry
  // for (const day of days) { ... }

  // TODO: summary
  const summary: BackfillSummary = {
    daysProcessed: 0,
    daysSkipped: 0,
    daysErrored: 0,
    fuelAggregatesUpserted: 0,
    fciDaysCalculated: 0,
    durationMs: 0,
  }

  console.warn('[fuel-backfill-j30] Résumé :', summary)
}

main().catch((err: unknown) => {
  console.error('[fuel-backfill-j30] Erreur fatale :', err)
  process.exit(1)
})
