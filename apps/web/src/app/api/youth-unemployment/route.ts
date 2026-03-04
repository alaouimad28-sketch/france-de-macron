import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createReadClient } from '@/lib/supabase/server'

const ALLOWED_GEOS = new Set(['FR', 'EU27_2020'])

export async function GET(request: NextRequest) {
  const geo = request.nextUrl.searchParams.get('geo')?.toUpperCase() ?? null
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(Number(limitRaw ?? 36), 1), 120)

  if (geo && !ALLOWED_GEOS.has(geo)) {
    return NextResponse.json({ error: 'Invalid geo. Allowed: FR, EU27_2020' }, { status: 400 })
  }

  const supabase = await createReadClient()

  let query = supabase
    .from('youth_unemployment_monthly')
    .select('month, geo, geo_label, unemployment_rate, unit')
    .order('month', { ascending: false })
    .limit(limit)

  if (geo) {
    query = query.eq('geo', geo)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch youth unemployment data' }, { status: 500 })
  }

  return NextResponse.json({
    data: data ?? [],
    meta: {
      geo: geo ?? 'FR,EU27_2020',
      limit,
    },
  })
}
