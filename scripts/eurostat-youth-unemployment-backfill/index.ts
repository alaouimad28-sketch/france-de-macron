/// <reference types="node" />
/// <reference path="../fuel-backfill-annee/dotenv.d.ts" />
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

type YouthInsert = Database['public']['Tables']['youth_unemployment_monthly']['Insert']
const BASE_URL =
  process.env['EUROSTAT_API_BASE_URL'] ??
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'
const DATASET = process.env['EUROSTAT_DATASET'] ?? 'une_rt_m'
const AGE = process.env['EUROSTAT_AGE'] ?? 'Y_LT25'
const SEX = process.env['EUROSTAT_SEX'] ?? 'T'
const UNIT = process.env['EUROSTAT_UNIT'] ?? 'PC_ACT'
const S_ADJ = process.env['EUROSTAT_S_ADJ'] ?? 'SA'
const GEOS = (process.env['EUROSTAT_GEOS'] ?? 'FR,EU27_2020').split(',').map((g) => g.trim())

interface EurostatResponse {
  dimension: { time?: { category: { index: Record<string, number> } } }
  value?: Record<string, number>
}

function toMonthStart(timeKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(timeKey.trim())
  if (!match) throw new Error(`[eurostat-youth] unsupported time key: ${timeKey}`)
  return `${match[1]}-${match[2]}-01`
}

function normalizePayload(payload: EurostatResponse): Array<{ month: string; rate: number }> {
  const timeIndex = payload.dimension.time?.category.index
  if (!timeIndex) throw new Error('[eurostat-youth] missing time dimension')
  const values = payload.value ?? {}

  return Object.entries(timeIndex)
    .sort((a, b) => a[1] - b[1])
    .flatMap(([time, idx]) => {
      const rate = values[String(idx)]
      if (typeof rate !== 'number' || !Number.isFinite(rate)) return []
      return [{ month: toMonthStart(time), rate }]
    })
}

function requestUrl(geo: string): string {
  const url = new URL(`${BASE_URL}/${DATASET}`)
  url.searchParams.set('lang', 'en')
  url.searchParams.set('format', 'JSON')
  url.searchParams.set('geo', geo)
  url.searchParams.set('age', AGE)
  url.searchParams.set('sex', SEX)
  url.searchParams.set('unit', UNIT)
  url.searchParams.set('s_adj', S_ADJ)
  return url.toString()
}

async function fetchGeo(
  geo: string,
): Promise<{ rows: Array<{ month: string; rate: number }>; sourceUrl: string }> {
  const sourceUrl = requestUrl(geo)
  const response = await fetch(sourceUrl, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`[eurostat-youth] request failed ${response.status} for ${geo}`)
  const payload = (await response.json()) as EurostatResponse
  return { rows: normalizePayload(payload), sourceUrl }
}

function toInserts(
  geo: string,
  geoLabel: string,
  sourceUrl: string,
  rows: Array<{ month: string; rate: number }>,
): YouthInsert[] {
  const fetchedAt = new Date().toISOString()
  return rows.map((row) => ({
    month: row.month,
    geo,
    geo_label: geoLabel,
    unemployment_rate: row.rate,
    age: AGE,
    sex: SEX,
    seasonal_adjustment: S_ADJ,
    unit: UNIT,
    source_dataset: DATASET,
    source_url: sourceUrl,
    source_meta: { fetched_at: fetchedAt },
  }))
}

async function store(records: YouthInsert[]): Promise<number> {
  if (records.length === 0) return 0
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) throw new Error('[eurostat-youth] missing Supabase envs')
  const supabase = createClient<Database>(url, key)
  const { error } = await supabase
    .from('youth_unemployment_monthly')
    .upsert(records, { onConflict: 'month,geo,age,sex,seasonal_adjustment,unit' })
  if (error) throw new Error(`[eurostat-youth] upsert failed: ${error.message}`)
  return records.length
}

async function main(): Promise<void> {
  const dryRun = process.env['DRY_RUN'] === '1'
  const records: YouthInsert[] = []
  for (const geo of GEOS) {
    if (!geo) continue
    const { rows, sourceUrl } = await fetchGeo(geo)
    const geoLabel = geo === 'EU27_2020' ? 'Union européenne (UE-27)' : geo
    records.push(...toInserts(geo, geoLabel, sourceUrl, rows))
    console.log(`[eurostat-youth] fetched ${rows.length} rows for ${geo}`)
  }

  const stored = dryRun ? 0 : await store(records)
  console.log('[eurostat-youth] done', {
    dryRun,
    recordsPrepared: records.length,
    recordsStored: stored,
  })
}

main().catch((error: unknown) => {
  console.error('[eurostat-youth] fatal', error)
  process.exit(1)
})
