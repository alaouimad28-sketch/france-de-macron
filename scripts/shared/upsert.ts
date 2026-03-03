import type { SupabaseClient } from '@supabase/supabase-js'
import type { FuelDayAggregate } from './types'

const BATCH_SIZE = 500

/**
 * Upsert les agrégats dans fuel_daily_agg. Idempotent : ON CONFLICT (day, fuel_code) DO UPDATE.
 */
export async function upsertFuelAggregates(
  supabase: SupabaseClient,
  rows: FuelDayAggregate[],
): Promise<number> {
  if (rows.length === 0) return 0
  let upserted = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
      day: r.day,
      fuel_code: r.fuelCode,
      avg_price_eur_per_l: r.avgPrice,
      min_price_eur_per_l: r.minPrice,
      max_price_eur_per_l: r.maxPrice,
      sample_count: r.sampleCount,
    }))
    const { error } = await supabase.from('fuel_daily_agg').upsert(batch, {
      onConflict: 'day,fuel_code',
    })
    if (error) throw new Error(`Supabase upsert: ${error.message}`)
    upserted += batch.length
  }
  return upserted
}
