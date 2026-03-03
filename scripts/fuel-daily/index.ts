/// <reference types="node" />
/// <reference path="../fuel-backfill-annee/dotenv.d.ts" />
/**
 * Job : fuel-daily
 *
 * Ingestion quotidienne J-1 des données carburant (+ recalcul FCI à venir).
 * Déclenché par Vercel Cron (/api/cron/fuel-daily) ou manuellement.
 *
 * Usage :
 *   pnpm fuel:daily
 *   FUEL_DATE=20241115 pnpm fuel:daily  (replay d'une date spécifique, format YYYYMMDD)
 *
 * Voir README.md pour l'algorithme complet et les spécifications FCI.
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

interface DailyJobResult {
  targetDate: string
  fuelAggregatesUpserted: number
  fciScore: number | null
  durationMs: number
  status: 'success' | 'partial' | 'error'
  errors: string[]
}

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

/**
 * Calcule et upsert le score FCI pour une date donnée.
 * TODO: implémenter le calcul v1 — voir docs/data/methodology.md
 */
async function calcAndUpsertFCI(_day: Date): Promise<number | null> {
  return null
}

async function main(): Promise<void> {
  const startMs = Date.now()

  const targetDate = process.env['FUEL_DATE']
    ? parseManualDate(process.env['FUEL_DATE'])
    : getYesterday()

  const result: DailyJobResult = {
    targetDate: targetDate.toISOString().slice(0, 10),
    fuelAggregatesUpserted: 0,
    fciScore: null,
    durationMs: 0,
    status: 'success',
    errors: [],
  }

  console.log('[fuel-daily] Date cible :', result.targetDate)

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) {
    result.status = 'error'
    result.errors.push('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis')
    result.durationMs = Date.now() - startMs
    console.error('[fuel-daily]', result.errors[0])
    console.warn('[fuel-daily] Résultat :', result)
    process.exit(1)
  }
  const supabase = createClient(url, key)

  try {
    const xml = await downloadDayXml(targetDate)
    const rows = await parseDayXmlToAggregates(xml, targetDate)
    const n = await upsertFuelAggregates(supabase, rows)
    result.fuelAggregatesUpserted = n
    console.log('[fuel-daily]', result.targetDate, '—', rows.length, 'agrégats,', n, 'upsertés')

    const fci = await calcAndUpsertFCI(targetDate)
    result.fciScore = fci ?? null
    if (fci != null) console.log('[fuel-daily] FCI :', fci)
  } catch (err) {
    if (err instanceof DayDataUnavailableError) {
      result.status = 'partial'
      result.errors.push(err.message)
      console.warn('[fuel-daily] Données indisponibles pour', result.targetDate)
    } else {
      result.status = 'error'
      result.errors.push(err instanceof Error ? err.message : String(err))
      console.error('[fuel-daily] Erreur :', err)
    }
  }

  result.durationMs = Date.now() - startMs
  console.log('[fuel-daily] Résultat :', result)
}

main().catch((err: unknown) => {
  console.error('[fuel-daily] Erreur fatale :', err)
  process.exit(1)
})
