/// <reference types="node" />
/// <reference path="../fuel-backfill-annee/dotenv.d.ts" />
/**
 * Job : fuel-backfill-last
 *
 * Rafraîchit uniquement J-1 (hier) et optionnellement J-0 (aujourd'hui).
 * Utile quand l'historique est déjà en base et qu'on veut éviter de relancer J30 ou annuel.
 *
 * Usage :
 *   pnpm fuel:backfill:last
 *   BACKFILL_INCLUDE_TODAY=1 pnpm fuel:backfill:last   # hier + aujourd'hui
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

const envPaths = [
  path.join(process.cwd(), 'apps', 'web', '.env.local'),
  path.join(process.cwd(), '.env.local'),
  path.resolve(__dirname, '..', '..', 'apps', 'web', '.env.local'),
]
for (const p of envPaths) {
  config({ path: p })
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) break
}

function getYesterday(): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function getToday(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

async function main(): Promise<void> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) {
    console.error(
      'NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (ex. apps/web/.env.local).',
    )
    process.exit(1)
  }
  const supabase = createClient(url, key)

  const includeToday =
    process.env['BACKFILL_INCLUDE_TODAY'] === '1' ||
    process.env['BACKFILL_INCLUDE_TODAY'] === 'true'
  const days: Date[] = [getYesterday()]
  if (includeToday) days.push(getToday())

  console.log(
    '[fuel-backfill-last] Jours à traiter :',
    days.map((d) => d.toISOString().slice(0, 10)).join(', '),
  )

  const startMs = Date.now()
  let processed = 0
  let skipped = 0
  let errored = 0
  let upserted = 0

  for (const day of days) {
    const dayStr = day.toISOString().slice(0, 10)
    try {
      const xml = await downloadDayXml(day)
      const results = await parseDayXmlToAggregates(xml, day)
      const n = await upsertFuelAggregates(supabase, results)
      processed += 1
      upserted += n
      console.log('[fuel-backfill-last]', dayStr, '—', results.length, 'agrégats,', n, 'upsertés')
    } catch (err) {
      if (err instanceof DayDataUnavailableError) {
        skipped += 1
        console.warn('[fuel-backfill-last]', dayStr, '— skip (données indisponibles)')
      } else {
        errored += 1
        console.error(
          '[fuel-backfill-last]',
          dayStr,
          '— erreur:',
          err instanceof Error ? err.message : err,
        )
      }
    }
  }

  const durationMs = Date.now() - startMs
  console.log('\n[fuel-backfill-last] Résumé :', {
    processed,
    skipped,
    errored,
    upserted,
    durationMs: `${(durationMs / 1000).toFixed(1)}s`,
  })
}

main().catch((err: unknown) => {
  console.error('[fuel-backfill-last] Erreur fatale :', err)
  process.exit(1)
})
