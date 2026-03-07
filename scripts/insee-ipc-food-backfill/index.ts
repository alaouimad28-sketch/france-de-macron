/// <reference types="node" />
/// <reference path="../fuel-backfill-annee/dotenv.d.ts" />

import * as path from 'path'
import * as sax from 'sax'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const envPaths = [
  path.join(process.cwd(), 'apps', 'web', '.env.local'),
  path.join(process.cwd(), '.env.local'),
  path.resolve(__dirname, '..', '..', 'apps', 'web', '.env.local'),
]

for (const p of envPaths) {
  config({ path: p })
  if (process.env['SUPABASE_SERVICE_ROLE_KEY']) break
}

// IPC alimentaire (base 2025, France, mensuel) — données à jour (LAST_UPDATE 2026-02-27, obs. jusqu'à 2026-02). Ancienne base 2015 : 001763856.
const DEFAULT_SERIES_ID = process.env['INSEE_IPC_FOOD_SERIES_ID'] ?? '011813717'
// INSEE BDM SDMX: api.insee.fr deprecated → use bdm.insee.fr (see https://portail-api.insee.fr/ and https://www.insee.fr/en/information/2868055)
const DEFAULT_BASE_URL =
  process.env['INSEE_BDM_API_BASE_URL'] ?? 'https://bdm.insee.fr/series/sdmx/data/SERIES_BDM'
const DEFAULT_TIMEOUT_MS = Number(process.env['INSEE_API_TIMEOUT_MS'] ?? '30000')
const DRY_RUN = process.env['DRY_RUN'] === '1'

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | {
      [key: string]: JsonValue
    }

interface InseeRawObservation {
  period: string
  value: number
  rawPayload: Record<string, JsonValue>
}

interface IpcFoodMonthlyRecord {
  month: string
  indexValue: number
  sourceSeriesId: string
  sourceLabel: string
  rawPayload: Record<string, JsonValue>
}

interface IpcFoodMonthlyInsert {
  month: string
  index_value: number
  source_series_id: string
  source_label: string
  raw_payload: Record<string, JsonValue>
}

function asObject(value: JsonValue): Record<string, JsonValue> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, JsonValue>
}

function coercePeriodToMonth(periodRaw: string): string | null {
  const period = periodRaw.trim()

  const yyyyMm = /^(\d{4})-(\d{2})$/
  const yyyyMmDd = /^(\d{4})-(\d{2})-(\d{2})$/
  const yyyyMmm = /^(\d{4})M(\d{2})$/i

  const m1 = period.match(yyyyMm)
  if (m1) {
    return `${m1[1]}-${m1[2]}-01`
  }

  const m2 = period.match(yyyyMmDd)
  if (m2) {
    return `${m2[1]}-${m2[2]}-01`
  }

  const m3 = period.match(yyyyMmm)
  if (m3) {
    return `${m3[1]}-${m3[2]}-01`
  }

  const yyyy = /^(\d{4})$/
  const m4 = period.match(yyyy)
  if (m4) {
    return `${m4[1]}-01-01`
  }

  // Trimestriel : AAAA-Qn (guide SDMX v2.2 — Juin 2020)
  const yyyyQ = /^(\d{4})-Q([1-4])$/i
  const m5 = period.match(yyyyQ)
  if (m5) {
    const month = String((Number(m5[2]) - 1) * 3 + 1).padStart(2, '0')
    return `${m5[1]}-${month}-01`
  }

  return null
}

/**
 * Parse SDMX XML response from bdm.insee.fr (StructureSpecificData with Obs elements).
 */
function parseSdmxXml(xml: string): Promise<InseeRawObservation[]> {
  const observations: InseeRawObservation[] = []
  const parser = sax.createStream(true, { trim: true })

  parser.on(
    'opentag',
    (node: { name?: string; local?: string; attributes?: Record<string, unknown> }) => {
      const tagName = (node.name ?? node.local ?? '').toLowerCase()
      if (tagName !== 'obs') return
      const attrs = (node.attributes ?? {}) as Record<string, string | undefined>
      const timePeriod = attrs['TIME_PERIOD'] ?? attrs['time_period']
      const obsValue = attrs['OBS_VALUE'] ?? attrs['obs_value']
      if (typeof timePeriod !== 'string' || obsValue === undefined) return
      if (
        obsValue === 'NaN' ||
        (typeof obsValue === 'string' && obsValue.trim().toUpperCase() === 'NAN')
      )
        return
      const value =
        typeof obsValue === 'string' ? Number(obsValue.replace(',', '.')) : Number(obsValue)
      if (!Number.isFinite(value)) return
      const month = coercePeriodToMonth(timePeriod)
      if (!month) return
      observations.push({
        period: month,
        value,
        rawPayload: { TIME_PERIOD: timePeriod, OBS_VALUE: value },
      })
    },
  )

  return new Promise<InseeRawObservation[]>((resolve, reject) => {
    parser.on('end', () => {
      const dedup = new Map<string, InseeRawObservation>()
      for (const obs of observations) {
        dedup.set(obs.period, obs)
      }
      resolve([...dedup.values()].sort((a, b) => a.period.localeCompare(b.period)))
    })
    parser.on('error', reject)
    parser.write(xml)
    parser.end()
  })
}

function parseObservationCandidate(
  candidate: Record<string, JsonValue>,
): InseeRawObservation | null {
  const periodKeys = ['period', 'TIME_PERIOD', '@TIME_PERIOD', 'time_period', 'date', 'month']
  const valueKeys = ['value', 'OBS_VALUE', '@OBS_VALUE', 'obs_value', 'index', 'index_value']

  let periodRaw: string | null = null
  for (const key of periodKeys) {
    const maybe = candidate[key]
    if (typeof maybe === 'string' && maybe.trim().length > 0) {
      periodRaw = maybe
      break
    }
  }

  let valueRaw: number | null = null
  for (const key of valueKeys) {
    const maybe = candidate[key]
    if (typeof maybe === 'number' && Number.isFinite(maybe)) {
      valueRaw = maybe
      break
    }

    if (typeof maybe === 'string') {
      const parsed = Number(maybe.replace(',', '.'))
      if (Number.isFinite(parsed)) {
        valueRaw = parsed
        break
      }
    }
  }

  if (!periodRaw || valueRaw === null) return null

  const month = coercePeriodToMonth(periodRaw)
  if (!month) return null

  return {
    period: month,
    value: valueRaw,
    rawPayload: candidate,
  }
}

function extractObservationsFromJson(payload: JsonValue): InseeRawObservation[] {
  const results: InseeRawObservation[] = []

  const visit = (node: JsonValue): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }

    const objectNode = asObject(node)
    if (!objectNode) return

    const parsed = parseObservationCandidate(objectNode)
    if (parsed) {
      results.push(parsed)
    }

    for (const value of Object.values(objectNode)) {
      visit(value)
    }
  }

  visit(payload)

  const dedup = new Map<string, InseeRawObservation>()
  for (const obs of results) {
    dedup.set(obs.period, obs)
  }

  return [...dedup.values()].sort((a, b) => a.period.localeCompare(b.period))
}

async function fetchInseeIpcFoodSeries(seriesId: string): Promise<InseeRawObservation[]> {
  const token = process.env['INSEE_API_TOKEN']
  const lastN = process.env['INSEE_LAST_N_OBSERVATIONS']
  const query = lastN ? `?lastNObservations=${encodeURIComponent(lastN)}` : ''
  const url = `${DEFAULT_BASE_URL}/${encodeURIComponent(seriesId)}${query}`

  const headers: Record<string, string> = {
    Accept: 'application/vnd.sdmx.structurespecificdata+xml;version=2.1, application/xml',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `[insee-ipc-food] INSEE request failed (${response.status}) on ${url}: ${body.slice(0, 300)}`,
    )
  }

  const contentType = response.headers.get('content-type') ?? ''
  let observations: InseeRawObservation[]

  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as JsonValue
    observations = extractObservationsFromJson(payload)
  } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
    const text = await response.text()
    observations = await parseSdmxXml(text)
  } else {
    const text = await response.text()
    throw new Error(
      `[insee-ipc-food] Unexpected content-type "${contentType}". Body start: ${text.slice(0, 200)}`,
    )
  }

  if (observations.length === 0) {
    throw new Error(
      '[insee-ipc-food] No monthly observations found in INSEE payload. Check parser keys / response shape.',
    )
  }

  return observations
}

function normalizeIpcObservations(
  observations: InseeRawObservation[],
  sourceSeriesId: string,
): IpcFoodMonthlyRecord[] {
  return observations
    .filter((obs) => Number.isFinite(obs.value) && obs.value > 0)
    .map((obs) => ({
      month: obs.period,
      indexValue: obs.value,
      sourceSeriesId,
      sourceLabel: 'INSEE IPC alimentaire (SERIES_BDM)',
      rawPayload: obs.rawPayload,
    }))
}

async function storeIpcFoodMonthly(records: IpcFoodMonthlyRecord[]): Promise<number> {
  if (records.length === 0) return 0
  if (DRY_RUN) {
    console.log('[insee-ipc-food] DRY_RUN=1, skipping DB upsert')
    return records.length
  }

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    throw new Error(
      '[insee-ipc-food] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
    )
  }

  const supabase = createClient(url, key)

  const payload: IpcFoodMonthlyInsert[] = records.map((record) => ({
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

  console.log('[insee-ipc-food] starting run')
  console.log('[insee-ipc-food] series id:', DEFAULT_SERIES_ID)
  console.log('[insee-ipc-food] dry run:', DRY_RUN)

  const observations = await fetchInseeIpcFoodSeries(DEFAULT_SERIES_ID)
  const normalized = normalizeIpcObservations(observations, DEFAULT_SERIES_ID)
  const stored = await storeIpcFoodMonthly(normalized)

  const latest = normalized[normalized.length - 1]

  console.log(
    '[insee-ipc-food] done',
    JSON.stringify(
      {
        observationsFetched: observations.length,
        recordsNormalized: normalized.length,
        recordsStored: stored,
        latestMonth: latest?.month ?? null,
        latestIndexValue: latest?.indexValue ?? null,
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
