/**
 * Route Handler — Données carburants par période
 *
 * GET /api/fuel?period=7j|30j|90j|1an|5ans|max
 *   Retourne les agrégats fuel_daily_agg pivotés en FuelChartDataPoint[]
 *   Utilisé par FuelChart côté client pour les périodes longues (1an, 5ans, max)
 *
 * Sémantique : toujours les N derniers jours jusqu'à aujourd'hui.
 *
 * Pagination : PostgREST caps responses at `max_rows` (default 1000). We paginate
 * in batches to fetch the full date range regardless of that setting.
 *
 * Cache : 1h côté CDN, stale-while-revalidate 24h
 */
import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/database.types'
import type { FuelChartDataPoint, FuelPeriodFilter } from '@/types'

const FUEL_CODES = ['gazole', 'e10', 'sp98']
const PAGE_SIZE = 1000

function getPeriodDays(period: FuelPeriodFilter): number {
  switch (period) {
    case '7j':
      return 7
    case '30j':
      return 30
    case '90j':
      return 90
    case '1an':
      return 365
    case '5ans':
      return 1825
    case 'max':
      return 7300
    default:
      return 90
  }
}

type FuelRow = { day: string; fuel_code: string; avg_price_eur_per_l: number }

export async function GET(request: NextRequest) {
  const rawPeriod = request.nextUrl.searchParams.get('period') ?? '90j'
  const period = rawPeriod as FuelPeriodFilter
  const days = getPeriodDays(period)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient<Database>(url, key)

  const todayIso = new Date().toISOString().slice(0, 10)
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const fromDateIso = fromDate.toISOString().slice(0, 10)

  const allRows: FuelRow[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('fuel_daily_agg')
      .select('day, fuel_code, avg_price_eur_per_l')
      .in('fuel_code', FUEL_CODES)
      .gte('day', fromDateIso)
      .lte('day', todayIso)
      .order('day', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      return NextResponse.json({ error: 'Data fetch failed' }, { status: 500 })
    }

    const rows = (data ?? []) as FuelRow[]
    allRows.push(...rows)

    hasMore = rows.length === PAGE_SIZE
    offset += PAGE_SIZE
  }

  // Pivot rows → FuelChartDataPoint[]
  const byDate = new Map<string, FuelChartDataPoint>()
  for (const row of allRows) {
    if (!byDate.has(row.day)) byDate.set(row.day, { date: row.day })
    const entry = byDate.get(row.day)!
    entry[row.fuel_code] = row.avg_price_eur_per_l
  }

  const chartData = [...byDate.values()].sort((a, b) =>
    (a.date as string).localeCompare(b.date as string),
  )

  return NextResponse.json(chartData, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
