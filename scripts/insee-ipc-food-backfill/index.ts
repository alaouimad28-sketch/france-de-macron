/// <reference types="node" />
/// <reference path="../fuel-backfill-annee/dotenv.d.ts" />

/**
 * Job (scaffold): insee-ipc-food-backfill
 *
 * Objective (P0): prepare the ingestion path for INSEE IPC alimentaire.
 * This scaffold is intentionally non-breaking and does NOT perform live writes yet.
 *
 * Planned flow:
 *   1) fetch INSEE BDM series payload (auth + endpoint to validate)
 *   2) normalize monthly observations
 *   3) upsert into public.ipc_food_monthly
 */

import * as path from 'path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../apps/web/src/lib/supabase/database.types'

const envPaths = [
  path.join(process.cwd(), 'apps', 'web', '.env.local'),
  path.join(process.cwd(), '.env.local'),
  path.resolve(__dirname, '..', '..', 'apps', 'web', '.env.local'),
]

for (const p of envPaths) {
  config({ path: p })
  if (process.env['SUPABASE_SERVICE_ROLE_KEY']) break
}

const DEFAULT_SERIES_ID = process.env['INSEE_IPC_FOOD_SERIES_ID'] ?? '001767226'

interface InseeRawObservation {
  period: string
  value: number
}

interface IpcFoodMonthlyRecord {
  month: string
  indexValue: number
  sourceSeriesId: string
  sourceLabel: string
  rawPayload: Record<string, unknown>
}

async function fetchInseeIpcFoodSeries(seriesId: string): Promise<InseeRawObservation[]> {
  const token = process.env['INSEE_API_TOKEN']
  const baseUrl =
    process.env['INSEE_BDM_API_BASE_URL'] ??
    'https://api.insee.fr/series/BDM/V1/data/SERIES_BDM'

  if (!token) {
    console.warn('[insee-ipc-food] TODO: missing INSEE_API_TOKEN, skipping remote fetch scaffold')
    return []
  }

  const url = `${baseUrl}/${encodeURIComponent(seriesId)}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`[insee-ipc-food] INSEE request failed (${response.status}) on ${url}`)
  }

  const payload = (await response.json()) as Record<string, unknown>

  // TODO: confirm exact response shape for BDM series payload
  // TODO: map payload observations to { period: YYYY-MM, value: number }
  void payload
  return []
}

function normalizeIpcObservations(
  observations: InseeRawObservation[],
  sourceSeriesId: string,
): IpcFoodMonthlyRecord[] {
  return observations
    .filter((obs) => Number.isFinite(obs.value))
    .map((obs) => ({
      month: obs.period,
      indexValue: obs.value,
      sourceSeriesId,
      sourceLabel: 'INSEE IPC alimentaire (SERIES_BDM)',
      rawPayload: {
        period: obs.period,
        value: obs.value,
      },
    }))
}

async function storeIpcFoodMonthly(records: IpcFoodMonthlyRecord[]): Promise<number> {
  if (records.length === 0) return 0

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    throw new Error('[insee-ipc-food] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }

  const supabase = createClient<Database>(url, key)

  const payload = records.map((record) => ({
    month: record.month,
    index_value: record.indexValue,
    source_series_id: record.sourceSeriesId,
    source_label: record.sourceLabel,
    raw_payload: record.rawPayload,
  }))

  const { error } = await supabase
    .from('ipc_food_monthly')
    .upsert(payload, { onConflict: 'month,source_series_id' })

  if (error) {
    throw new Error(`[insee-ipc-food] Upsert failed: ${error.message}`)
  }

  return payload.length
}

async function main(): Promise<void> {
  const startedAt = Date.now()

  console.log('[insee-ipc-food] starting scaffold run')
  console.log('[insee-ipc-food] series id:', DEFAULT_SERIES_ID)

  const observations = await fetchInseeIpcFoodSeries(DEFAULT_SERIES_ID)
  const normalized = normalizeIpcObservations(observations, DEFAULT_SERIES_ID)
  const stored = await storeIpcFoodMonthly(normalized)

  console.log(
    '[insee-ipc-food] done',
    JSON.stringify(
      {
        observationsFetched: observations.length,
        recordsNormalized: normalized.length,
        recordsStored: stored,
        durationMs: Date.now() - startedAt,
      },
      null,
      2,
    ),
  )
}

main().catch((error: unknown) => {
  console.error('[insee-ipc-food] fatal error', error)
  process.exit(1)
})
