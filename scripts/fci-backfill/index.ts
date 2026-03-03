/// <reference types="node" />
/// <reference path="../fuel-backfill-annee/dotenv.d.ts" />
/**
 * Job : fci-backfill
 *
 * Calcule le FCI v1 pour tous les jours depuis une date de début (défaut: 2019-01-01)
 * afin d'avoir l'historique du French Cooked Index™ pour graphiques et analyse.
 *
 * Prérequis : fuel_daily_agg doit déjà être peuplé (backfill carburants).
 *
 * Usage :
 *   pnpm run fci:backfill
 *   START_DATE=2020-01-01 pnpm run fci:backfill
 *   START_DATE=2019-01-01 END_DATE=2024-12-31 pnpm run fci:backfill
 *
 * Variables d'env optionnelles :
 *   START_DATE  — date de début (YYYY-MM-DD), défaut 2019-01-01
 *   END_DATE    — date de fin (YYYY-MM-DD), défaut = dernier jour en base
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../apps/web/src/lib/supabase/database.types'
import * as path from 'path'
import { config } from 'dotenv'
import { calcAndUpsertFCI } from '../shared'

const envPaths = [
  path.join(process.cwd(), 'apps', 'web', '.env.local'),
  path.join(process.cwd(), '.env.local'),
  path.resolve(__dirname, '..', '..', 'apps', 'web', '.env.local'),
]
for (const p of envPaths) {
  config({ path: p })
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) break
}

const DEFAULT_START = '2019-01-01'

function parseDate(iso: string): Date {
  const d = new Date(iso + 'T12:00:00Z')
  if (Number.isNaN(d.getTime())) throw new Error(`Date invalide : "${iso}"`)
  return d
}

function dateToISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function main(): Promise<void> {
  const startMs = Date.now()
  const startDateStr = process.env['START_DATE'] ?? DEFAULT_START
  const endDateStr = process.env['END_DATE']

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) {
    console.error('[fci-backfill] NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis')
    process.exit(1)
  }

  const supabase = createClient<Database>(url, key)
  const startDate = parseDate(startDateStr)

  // Premier jour calculable = startDate + 30 jours (il faut 30j d'historique)
  const firstComputable = new Date(startDate)
  firstComputable.setUTCDate(firstComputable.getUTCDate() + 29)

  // Dernier jour : END_DATE si fourni, sinon max(day) en base
  let endDate: Date
  if (endDateStr) {
    endDate = parseDate(endDateStr)
  } else {
    const { data: maxRow, error } = await supabase
      .from('fuel_daily_agg')
      .select('day')
      .eq('fuel_code', 'gazole')
      .order('day', { ascending: false })
      .limit(1)
      .single()
    if (error || !maxRow) {
      console.error(
        '[fci-backfill] Impossible de récupérer le dernier jour en base:',
        error?.message,
      )
      process.exit(1)
    }
    endDate = parseDate(maxRow.day as string)
  }

  if (firstComputable > endDate) {
    console.warn(
      '[fci-backfill] Aucun jour à calculer (first computable',
      dateToISO(firstComputable),
      '> end',
      dateToISO(endDate),
      ')',
    )
    process.exit(0)
  }

  console.log('[fci-backfill] Période :', dateToISO(firstComputable), '→', dateToISO(endDate))

  let computed = 0
  let skipped = 0
  const current = new Date(firstComputable)

  while (current <= endDate) {
    const score = await calcAndUpsertFCI(supabase, new Date(current))
    if (score !== null) {
      computed++
      if (computed % 500 === 0 || computed <= 5) {
        console.log('[fci-backfill]', dateToISO(current), '→ FCI', score, `(${computed} calculés)`)
      }
    } else {
      skipped++
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }

  const durationMs = Date.now() - startMs
  console.log(
    '[fci-backfill] Terminé :',
    computed,
    'jours avec FCI,',
    skipped,
    'skippés (données insuffisantes),',
    Math.round(durationMs / 1000),
    's',
  )
}

main().catch((err: unknown) => {
  console.error('[fci-backfill] Erreur fatale :', err)
  process.exit(1)
})
