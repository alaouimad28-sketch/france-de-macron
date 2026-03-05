/// <reference types="node" />

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../apps/web/src/lib/supabase/database.types'
import { assert } from './common'

async function checkIpcFood(supabase: ReturnType<typeof createClient<Database>>): Promise<void> {
  const { data, error } = await supabase
    .from('ipc_food_monthly')
    .select('month, index_value')
    .order('month', { ascending: false })
    .limit(2000)

  if (error) {
    throw new Error(`Failed querying ipc_food_monthly: ${error.message}`)
  }

  const rows = data ?? []
  assert(rows.length >= 12, `INSEE IPC alimentaire: expected >= 12 rows, got ${rows.length}`)

  const latestMonth = rows[0]?.month
  assert(typeof latestMonth === 'string', 'INSEE IPC alimentaire: latest month missing')
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(latestMonth),
    `INSEE IPC alimentaire: invalid month format ${String(latestMonth)}`,
  )

  const invalidValues = rows.filter(
    (row) => typeof row.index_value !== 'number' || Number.isNaN(row.index_value),
  )
  assert(
    invalidValues.length === 0,
    `INSEE IPC alimentaire: ${invalidValues.length} invalid numeric values`,
  )

  console.log(
    `[qa:autonomous-datasets] INSEE IPC alimentaire OK (rows=${rows.length}, latest=${latestMonth})`,
  )
}

async function checkYouthUnemployment(
  supabase: ReturnType<typeof createClient<Database>>,
): Promise<void> {
  const { data, error } = await supabase
    .from('youth_unemployment_monthly')
    .select('month, unemployment_rate')
    .order('month', { ascending: false })
    .limit(2000)

  if (error) {
    throw new Error(`Failed querying youth_unemployment_monthly: ${error.message}`)
  }

  const rows = data ?? []
  assert(rows.length >= 24, `Eurostat chômage jeunes: expected >= 24 rows, got ${rows.length}`)

  const latestMonth = rows[0]?.month
  assert(typeof latestMonth === 'string', 'Eurostat chômage jeunes: latest month missing')
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(latestMonth),
    `Eurostat chômage jeunes: invalid month format ${String(latestMonth)}`,
  )

  const invalidValues = rows.filter(
    (row) => typeof row.unemployment_rate !== 'number' || Number.isNaN(row.unemployment_rate),
  )
  assert(
    invalidValues.length === 0,
    `Eurostat chômage jeunes: ${invalidValues.length} invalid numeric values`,
  )

  console.log(
    `[qa:autonomous-datasets] Eurostat chômage jeunes OK (rows=${rows.length}, latest=${latestMonth})`,
  )
}

async function main(): Promise<void> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    console.log(
      '[qa:autonomous-datasets] Live validation skipped (missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)',
    )
    return
  }

  const supabase = createClient<Database>(url, key)

  await checkIpcFood(supabase)
  await checkYouthUnemployment(supabase)

  console.log('[qa:autonomous-datasets] PASS')
}

main().catch((error: unknown) => {
  console.error('[qa:autonomous-datasets] FAIL', error)
  process.exit(1)
})
