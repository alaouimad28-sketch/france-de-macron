/**
 * Calcule le FCI v1 pour un jour donné et upsert dans fci_daily.
 * Utilisé par fuel-daily et fci-backfill.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../apps/web/src/lib/supabase/database.types'
import { calcFCIv1 } from './fci'

/**
 * Récupère les 30 derniers jours d'agrégats gazole et e10 (jour donné inclus),
 * calcule le FCI v1 et upsert dans fci_daily. Retourne null si données insuffisantes.
 */
export async function calcAndUpsertFCI(
  supabase: SupabaseClient<Database>,
  day: Date,
): Promise<number | null> {
  const dayISO = day.toISOString().slice(0, 10)
  const start = new Date(day)
  start.setUTCDate(start.getUTCDate() - 29)
  const startISO = start.toISOString().slice(0, 10)

  const { data: rows, error } = await supabase
    .from('fuel_daily_agg')
    .select('day, fuel_code, avg_price_eur_per_l')
    .gte('day', startISO)
    .lte('day', dayISO)
    .in('fuel_code', ['gazole', 'e10'])
    .order('day', { ascending: false })

  if (error) throw new Error(`fuel_daily_agg select: ${error.message}`)
  if (!rows?.length) return null

  type Row = { day: string; fuel_code: string; avg_price_eur_per_l: number }
  const typedRows = rows as Row[]
  const days = [...new Set(typedRows.map((r) => r.day))].sort().reverse()
  const gazole30j = days.map(
    (d) => typedRows.find((r) => r.day === d && r.fuel_code === 'gazole')?.avg_price_eur_per_l ?? 0,
  )
  const e10_30j = days.map(
    (d) => typedRows.find((r) => r.day === d && r.fuel_code === 'e10')?.avg_price_eur_per_l ?? 0,
  )

  if (gazole30j.length === 0 || e10_30j.length === 0) return null
  if (gazole30j[0] === 0 || e10_30j[0] === 0) return null

  const score = calcFCIv1(gazole30j, e10_30j)

  type FciInsert = Database['public']['Tables']['fci_daily']['Insert']
  const row: FciInsert = {
    day: dayISO,
    score,
    methodology_version: 'v1',
    components: { fuel: score },
    weights: { fuel: 1.0 },
  }
  const { error: upsertError } = await supabase.from('fci_daily').upsert(row, {
    onConflict: 'day',
  })
  if (upsertError) throw new Error(`fci_daily upsert: ${upsertError.message}`)

  return score
}
