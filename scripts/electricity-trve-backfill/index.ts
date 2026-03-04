/// <reference types="node" />
/// <reference path="../fuel-backfill-annee/dotenv.d.ts" />

import * as path from 'path'
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

const BASE_OPTION_URL =
  process.env['TRVE_BASE_OPTION_URL'] ??
  'https://www.cre.fr/fileadmin/Documents/Open_data/Marches_de_detail/Option_Base.csv'
const HPHC_OPTION_URL =
  process.env['TRVE_HPHC_OPTION_URL'] ??
  'https://www.cre.fr/fileadmin/Documents/Open_data/Marches_de_detail/Option_HPHC.csv'
const SOURCE_DATASET =
  process.env['TRVE_SOURCE_DATASET'] ??
  "Historique des tarifs réglementés de vente d'électricité pour les consommateurs résidentiels (data.gouv.fr)"
const METHOD_VERSION = process.env['TRVE_METHOD_VERSION'] ?? 'trve_v1'
const DRY_RUN = process.env['DRY_RUN'] === '1'

interface TariffRecordInsert {
  effective_date: string
  end_date: string | null
  option_code: 'BASE' | 'HPHC'
  subscribed_power_kva: number
  tariff_component: 'BASE' | 'HP' | 'HC'
  value_eur_kwh: number
  value_ct_kwh: number
  annual_fixed_ttc_eur: number | null
  source_dataset: string
  source_url: string
  method_version: string
  source_meta: {
    fetched_at: string
    raw_date_debut: string
    raw_date_fin: string
    input_file: string
  }
}

function parseFrenchDateToIso(value: string): string {
  const trimmed = value.trim()
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (!match) throw new Error(`[trve] invalid date format: ${value}`)
  return `${match[3]}-${match[2]}-${match[1]}`
}

function parseFrenchDateToIsoNullable(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return parseFrenchDateToIso(trimmed)
}

function parseFrenchNumber(value: string): number {
  const normalized = value.trim().replace(',', '.')
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) throw new Error(`[trve] invalid numeric value: ${value}`)
  return parsed
}

function parseCsv(raw: string): string[][] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(';').map((cell) => cell.trim()))
}

function toBaseRecords(rows: string[][], sourceUrl: string): TariffRecordInsert[] {
  const [header, ...body] = rows
  const expected = [
    'DATE_DEBUT',
    'DATE_FIN',
    'P_SOUSCRITE',
    'PART_FIXE_HT',
    'PART_FIXE_TTC',
    'PART_VARIABLE_HT',
    'PART_VARIABLE_TTC',
  ]

  if (header.join('|') !== expected.join('|')) {
    throw new Error('[trve] unexpected Option Base header shape')
  }

  const fetchedAt = new Date().toISOString()
  return body.map((cells) => {
    const variableEur = parseFrenchNumber(cells[6])
    return {
      effective_date: parseFrenchDateToIso(cells[0]),
      end_date: parseFrenchDateToIsoNullable(cells[1]),
      option_code: 'BASE',
      subscribed_power_kva: Number(cells[2]),
      tariff_component: 'BASE',
      value_eur_kwh: variableEur,
      value_ct_kwh: Number((variableEur * 100).toFixed(4)),
      annual_fixed_ttc_eur: parseFrenchNumber(cells[4]),
      source_dataset: SOURCE_DATASET,
      source_url: sourceUrl,
      method_version: METHOD_VERSION,
      source_meta: {
        fetched_at: fetchedAt,
        raw_date_debut: cells[0],
        raw_date_fin: cells[1],
        input_file: 'Option_Base.csv',
      },
    }
  })
}

function toHphcRecords(rows: string[][], sourceUrl: string): TariffRecordInsert[] {
  const [header, ...body] = rows
  const expected = [
    'DATE_DEBUT',
    'DATE_FIN',
    'P_SOUSCRITE',
    'PART_FIXE_HT',
    'PART_FIXE_TTC',
    'PART_VARIABLE_HC_HT',
    'PART_VARIABLE_HC_TTC',
    'PART_VARIABLE_HP_HT',
    'PART_VARIABLE_HP_TTC',
  ]

  if (header.join('|') !== expected.join('|')) {
    throw new Error('[trve] unexpected Option HPHC header shape')
  }

  const fetchedAt = new Date().toISOString()
  return body.flatMap((cells) => {
    const basePayload = {
      effective_date: parseFrenchDateToIso(cells[0]),
      end_date: parseFrenchDateToIsoNullable(cells[1]),
      option_code: 'HPHC' as const,
      subscribed_power_kva: Number(cells[2]),
      annual_fixed_ttc_eur: parseFrenchNumber(cells[4]),
      source_dataset: SOURCE_DATASET,
      source_url: sourceUrl,
      method_version: METHOD_VERSION,
      source_meta: {
        fetched_at: fetchedAt,
        raw_date_debut: cells[0],
        raw_date_fin: cells[1],
        input_file: 'Option_HPHC.csv',
      },
    }

    const hcEur = parseFrenchNumber(cells[6])
    const hpEur = parseFrenchNumber(cells[8])

    return [
      {
        ...basePayload,
        tariff_component: 'HC' as const,
        value_eur_kwh: hcEur,
        value_ct_kwh: Number((hcEur * 100).toFixed(4)),
      },
      {
        ...basePayload,
        tariff_component: 'HP' as const,
        value_eur_kwh: hpEur,
        value_ct_kwh: Number((hpEur * 100).toFixed(4)),
      },
    ]
  })
}

async function fetchRows(url: string): Promise<string[][]> {
  const response = await fetch(url, { headers: { Accept: 'text/csv' } })
  if (!response.ok) throw new Error(`[trve] request failed (${response.status}) for ${url}`)
  return parseCsv(await response.text())
}

async function store(records: TariffRecordInsert[]): Promise<number> {
  if (records.length === 0) return 0
  if (DRY_RUN) return records.length

  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const serviceRole = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!supabaseUrl || !serviceRole) {
    throw new Error('[trve] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient(supabaseUrl, serviceRole)
  const { error } = await supabase.from('electricity_tariff_history').upsert(records, {
    onConflict: 'effective_date,option_code,subscribed_power_kva,tariff_component,method_version',
  })

  if (error) throw new Error(`[trve] upsert failed: ${error.message}`)
  return records.length
}

async function main(): Promise<void> {
  const startedAt = Date.now()

  const baseRows = await fetchRows(BASE_OPTION_URL)
  const hphcRows = await fetchRows(HPHC_OPTION_URL)

  const records = [
    ...toBaseRecords(baseRows, BASE_OPTION_URL),
    ...toHphcRecords(hphcRows, HPHC_OPTION_URL),
  ]
  const stored = await store(records)

  console.log('[trve] done', {
    dryRun: DRY_RUN,
    recordsPrepared: records.length,
    recordsStored: stored,
    minEffectiveDate: records[0]?.effective_date ?? null,
    maxEffectiveDate: records[records.length - 1]?.effective_date ?? null,
    durationMs: Date.now() - startedAt,
  })
}

main().catch((error: unknown) => {
  console.error('[trve] fatal', error)
  process.exit(1)
})
