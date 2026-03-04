import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { computeFCIContributions, resolveFCIMethodVersion } from '@/lib/fci-explainability'
import { createReadClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createReadClient()
  const day = request.nextUrl.searchParams.get('day')

  let query = supabase.from('fci_daily').select('*').order('day', { ascending: false }).limit(1)

  if (day) {
    query = query.eq('day', day)
  }

  const { data: rawRow, error } = await query.maybeSingle()
  const row = rawRow as {
    day: string
    score: number
    methodology_version: string
    components: unknown
    weights: unknown
    fci_method_version?: string | null
  } | null

  if (error) {
    return NextResponse.json(
      { error: 'Impossible de charger la décomposition FCI.' },
      { status: 500 },
    )
  }

  if (!row) {
    return NextResponse.json({ error: 'Aucune donnée FCI disponible.' }, { status: 404 })
  }

  const { components, weights, contributions } = computeFCIContributions(
    row.components,
    row.weights,
  )
  const fciMethodVersion = resolveFCIMethodVersion(row)

  return NextResponse.json({
    day: row.day,
    score: row.score,
    methodology_version: row.methodology_version,
    fci_method_version: fciMethodVersion,
    components,
    weights,
    contributions,
    reconstructed_score: Number(
      contributions.reduce((total, item) => total + item.contribution, 0).toFixed(2),
    ),
  })
}
