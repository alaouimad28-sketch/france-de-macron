/// <reference types="node" />

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../apps/web/src/lib/supabase/database.types'
import { assert } from './common'

function runSyntheticCheck(): void {
  const samples = [0.2016, 0.2516, 0.174]

  for (const valueEur of samples) {
    const ct = Number((valueEur * 100).toFixed(4))
    const reconverted = Number((ct / 100).toFixed(4))
    const delta = Math.abs(reconverted - Number(valueEur.toFixed(4)))
    assert(delta <= 0.0001, `Synthetic conversion mismatch for ${valueEur}: got ${reconverted}`)
  }

  console.log('[qa:electricity-unit] Synthetic conversion checks OK')
}

async function runLiveCheckIfConfigured(): Promise<void> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    console.log(
      '[qa:electricity-unit] Live validation skipped (missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)',
    )
    return
  }

  const supabase = createClient<Database>(url, key)

  const { data, error } = await supabase
    .from('electricity_tariff_history')
    .select('effective_date, option_code, tariff_component, value_eur_kwh, value_ct_kwh')
    .eq('option_code', 'BASE')
    .eq('tariff_component', 'BASE')
    .order('effective_date', { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(`Failed to query electricity_tariff_history: ${error.message}`)
  }

  const rows = data ?? []
  assert(rows.length > 0, 'No electricity tariff rows found for live validation')

  for (const row of rows) {
    const expectedCt = Number((row.value_eur_kwh * 100).toFixed(4))
    const delta = Math.abs(expectedCt - row.value_ct_kwh)
    assert(
      delta <= 0.0002,
      `Unit mismatch on ${row.effective_date}: expected ${expectedCt}, got ${row.value_ct_kwh}`,
    )

    assert(
      row.value_ct_kwh >= 5 && row.value_ct_kwh <= 100,
      `Sanity bound failed on ${row.effective_date}: ${row.value_ct_kwh} ct€/kWh`,
    )
  }

  console.log(`[qa:electricity-unit] Live checks OK on ${rows.length} rows`)
}

async function main(): Promise<void> {
  runSyntheticCheck()
  await runLiveCheckIfConfigured()
  console.log('[qa:electricity-unit] PASS')
}

main().catch((error: unknown) => {
  console.error('[qa:electricity-unit] FAIL', error)
  process.exit(1)
})
