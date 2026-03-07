/**
 * Route Handler — Données IPC alimentaire par période
 *
 * GET /api/ipc-food?period=24m|5ans|10ans|max
 *   Retourne les mois depuis ipc_food_monthly, convertis en base 2015.
 *   Utilisé par FoodInflationChart pour les périodes 5 ans, 10 ans, max.
 *
 * Cache : 1h côté CDN, stale-while-revalidate 24h
 */
import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/database.types'
import { ipcToBase2015 } from '@/lib/ipc'
import type { IpcFoodChartPoint, IpcFoodPeriodFilter } from '@/types'

const MAX_MONTHS = 600

function getPeriodMonths(period: IpcFoodPeriodFilter): number {
  switch (period) {
    case '24m':
      return 24
    case '5ans':
      return 60
    case '10ans':
      return 120
    case 'max':
      return MAX_MONTHS
    default:
      return 24
  }
}

type IpcRow = { month: string; index_value: number }

export async function GET(request: NextRequest) {
  const rawPeriod = request.nextUrl.searchParams.get('period') ?? '24m'
  const period = rawPeriod as IpcFoodPeriodFilter
  const limit = getPeriodMonths(period)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient<Database>(url, key)

  const { data, error } = await supabase
    .from('ipc_food_monthly')
    .select('month, index_value')
    .order('month', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: 'Data fetch failed' }, { status: 500 })
  }

  const rows = (data ?? []) as IpcRow[]
  const chartData: IpcFoodChartPoint[] = rows
    .map((row) => ({
      month: row.month,
      index_value: ipcToBase2015(row.index_value),
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return NextResponse.json(chartData, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
