/**
 * Job : fuel-daily
 *
 * Ingestion quotidienne J-1 des données carburant + recalcul FCI.
 * Déclenché par Vercel Cron (/api/cron/fuel-daily) ou manuellement.
 *
 * Usage :
 *   pnpm fuel:daily
 *   FUEL_DATE=20241115 pnpm fuel:daily  (replay d'une date spécifique)
 *
 * Voir README.md pour l'algorithme complet et les spécifications FCI.
 *
 * TODO : Implémenter le pipeline complet
 */

// ---------------------------------------------------------------------------
// Types (spec — pas encore implémenté)
// ---------------------------------------------------------------------------

interface DailyJobResult {
  targetDate: string           // "YYYY-MM-DD"
  fuelAggregatesUpserted: number
  fciScore: number | null
  durationMs: number
  status: 'success' | 'partial' | 'error'
  errors: string[]
}

// ---------------------------------------------------------------------------
// Point d'entrée principal
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startMs = Date.now()

  // Déterminer la date cible
  const targetDate = process.env['FUEL_DATE']
    ? parseManualDate(process.env['FUEL_DATE'])
    : getYesterday()

  console.warn(`[fuel-daily] Date cible : ${targetDate.toISOString().slice(0, 10)}`)
  console.warn('[fuel-daily] PLACEHOLDER — non implémenté')
  console.warn('Voir scripts/fuel-daily/README.md pour la spec complète.')

  const result: DailyJobResult = {
    targetDate: targetDate.toISOString().slice(0, 10),
    fuelAggregatesUpserted: 0,
    fciScore: null,
    durationMs: Date.now() - startMs,
    status: 'error',
    errors: ['Non implémenté'],
  }

  console.warn('[fuel-daily] Résultat :', result)
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

function getYesterday(): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function parseManualDate(yyyymmdd: string): Date {
  if (!/^\d{8}$/.test(yyyymmdd)) {
    throw new Error(`FUEL_DATE invalide : "${yyyymmdd}" — format attendu YYYYMMDD`)
  }
  const year = parseInt(yyyymmdd.slice(0, 4), 10)
  const month = parseInt(yyyymmdd.slice(4, 6), 10) - 1
  const day = parseInt(yyyymmdd.slice(6, 8), 10)
  return new Date(Date.UTC(year, month, day))
}

main().catch((err: unknown) => {
  console.error('[fuel-daily] Erreur fatale :', err)
  process.exit(1)
})
