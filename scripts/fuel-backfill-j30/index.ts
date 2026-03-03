/// <reference types="node" />
/// <reference path="../fuel-backfill-annee/dotenv.d.ts" />
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
 */

import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import { config } from 'dotenv'
import {
  DayDataUnavailableError,
  downloadDayXml,
  parseDayXmlToAggregates,
  upsertFuelAggregates,
} from '../shared'

// Charger .env (apps/web/.env.local ou racine)
const envPaths = [
  path.join(process.cwd(), 'apps', 'web', '.env.local'),
  path.join(process.cwd(), '.env.local'),
  path.resolve(__dirname, '..', '..', 'apps', 'web', '.env.local'),
]
for (const p of envPaths) {
  config({ path: p })
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) break
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

/**
 * Calcule et upsert le score FCI pour une date donnée.
 * TODO: implémenter le calcul v1 (fuel stress score) — voir docs/data/methodology.md
 */
async function calcAndUpsertFCI(_day: Date): Promise<void> {
  throw new Error('calcAndUpsertFCI : non implémenté')
}

async function main(): Promise<void> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (ex. apps/web/.env.local)',
    )
  }
  const supabase = createClient(url, key)

  const startMs = Date.now()
  const summary: BackfillSummary = {
    daysProcessed: 0,
    daysSkipped: 0,
    daysErrored: 0,
    fuelAggregatesUpserted: 0,
    fciDaysCalculated: 0,
    durationMs: 0,
  }

  const today = new Date()
  const days: Date[] = []
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push(d)
  }

  console.log('[fuel-backfill-j30] Démarrage —', days.length, 'jours à traiter')
  console.log(
    '[fuel-backfill-j30] Période :',
    days[days.length - 1]?.toISOString().slice(0, 10),
    '→',
    days[0]?.toISOString().slice(0, 10),
  )

  for (const day of days) {
    const dayStr = day.toISOString().slice(0, 10)
    try {
      const xml = await downloadDayXml(day)
      const results = await parseDayXmlToAggregates(xml, day)
      const n = await upsertFuelAggregates(supabase, results)
      summary.daysProcessed += 1
      summary.fuelAggregatesUpserted += n
      console.log('[fuel-backfill-j30]', dayStr, '—', results.length, 'agrégats,', n, 'upsertés')
    } catch (err) {
      if (err instanceof DayDataUnavailableError) {
        summary.daysSkipped += 1
        console.warn('[fuel-backfill-j30]', dayStr, '— skip (données indisponibles)')
      } else {
        summary.daysErrored += 1
        console.error(
          '[fuel-backfill-j30]',
          dayStr,
          '— erreur:',
          err instanceof Error ? err.message : err,
        )
      }
    }
  }

  summary.durationMs = Date.now() - startMs
  console.log('\n[fuel-backfill-j30] Résumé :', summary)
}

main().catch((err: unknown) => {
  console.error('[fuel-backfill-j30] Erreur fatale :', err)
  process.exit(1)
})
