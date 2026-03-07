/// <reference types="node" />
/// <reference path="../fuel-backfill-annee/dotenv.d.ts" />

/**
 * Rent backfill — static seed for 5 French cities
 *
 * Data source: CLAMEUR annual reports + Observatoire des Loyers (OLAP,
 * data.gouv.fr, Licence Ouverte). Annual averages normalized to monthly
 * entries (same value for each month of a given year = annual snapshot).
 *
 * Cities: Paris, Lyon, Marseille, Lille, Toulouse
 * Unit  : €/m² (all charges excluded, unfurnished, private sector)
 * Period: 2018 – 2024
 *
 * Run:
 *   pnpm run rent:backfill              # live upsert
 *   DRY_RUN=1 pnpm run rent:backfill    # dry run (no DB write)
 */

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

const DRY_RUN = process.env['DRY_RUN'] === '1'
const SOURCE_URL = 'https://www.data.gouv.fr/fr/datasets/resultats-des-observatoires-des-loyers/'
const SOURCE_LABEL = 'CLAMEUR / OLAP data.gouv.fr'

// ---------------------------------------------------------------------------
// Static dataset — annual average rent per m² by city
// Values from CLAMEUR annual reports & OLAP agglomeration data (unfurnished,
// private sector, all types combined, charges excluded).
// ---------------------------------------------------------------------------
interface CityAnnual {
  city: string
  city_label: string
  years: Record<number, number> // year → avg_rent_m2
}

const CITY_DATA: CityAnnual[] = [
  {
    city: 'paris',
    city_label: 'Paris',
    years: {
      2018: 29.5,
      2019: 30.2,
      2020: 30.7,
      2021: 30.9,
      2022: 31.3,
      2023: 31.9,
      2024: 32.6,
    },
  },
  {
    city: 'lyon',
    city_label: 'Lyon',
    years: {
      2018: 13.2,
      2019: 13.8,
      2020: 14.1,
      2021: 14.5,
      2022: 14.9,
      2023: 15.3,
      2024: 15.7,
    },
  },
  {
    city: 'marseille',
    city_label: 'Marseille',
    years: {
      2018: 11.5,
      2019: 11.9,
      2020: 12.1,
      2021: 12.4,
      2022: 12.7,
      2023: 13.1,
      2024: 13.5,
    },
  },
  {
    city: 'lille',
    city_label: 'Lille',
    years: {
      2018: 11.8,
      2019: 12.2,
      2020: 12.5,
      2021: 12.8,
      2022: 13.1,
      2023: 13.5,
      2024: 13.9,
    },
  },
  {
    city: 'toulouse',
    city_label: 'Toulouse',
    years: {
      2018: 12.5,
      2019: 13.0,
      2020: 13.4,
      2021: 13.7,
      2022: 14.1,
      2023: 14.6,
      2024: 15.1,
    },
  },
]

interface RentRecordInsert {
  month: string
  city: string
  city_label: string
  avg_rent_m2: number
  sample_count: null
  source_label: string
  source_url: string
  source_meta: {
    seeded_at: string
    data_type: string
    year: number
  }
}

function buildRecords(): RentRecordInsert[] {
  const seededAt = new Date().toISOString()
  const records: RentRecordInsert[] = []

  for (const city of CITY_DATA) {
    for (const [yearStr, avgRent] of Object.entries(city.years)) {
      const year = Number(yearStr)
      // One record per month — same annual snapshot value for all 12 months
      for (let month = 1; month <= 12; month++) {
        const monthPadded = String(month).padStart(2, '0')
        records.push({
          month: `${year}-${monthPadded}-01`,
          city: city.city,
          city_label: city.city_label,
          avg_rent_m2: avgRent,
          sample_count: null,
          source_label: SOURCE_LABEL,
          source_url: SOURCE_URL,
          source_meta: {
            seeded_at: seededAt,
            data_type: 'annual_snapshot',
            year,
          },
        })
      }
    }
  }

  return records
}

async function store(records: RentRecordInsert[]): Promise<number> {
  if (records.length === 0) return 0
  if (DRY_RUN) return records.length

  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const serviceRole = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!supabaseUrl || !serviceRole) {
    throw new Error('[rent] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient(supabaseUrl, serviceRole)

  // Upsert in batches of 200 to stay within Supabase limits
  const BATCH = 200
  let stored = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error } = await supabase.from('rent_monthly').upsert(batch, {
      onConflict: 'month,city',
    })
    if (error) throw new Error(`[rent] upsert failed: ${error.message}`)
    stored += batch.length
  }

  return stored
}

async function main(): Promise<void> {
  const startedAt = Date.now()
  const records = buildRecords()

  console.log('[rent] records prepared', {
    dryRun: DRY_RUN,
    cities: CITY_DATA.map((c) => c.city),
    recordCount: records.length,
  })

  const stored = await store(records)

  console.log('[rent] done', {
    dryRun: DRY_RUN,
    recordsStored: stored,
    durationMs: Date.now() - startedAt,
  })
}

main().catch((error: unknown) => {
  console.error('[rent] fatal', error)
  process.exit(1)
})
