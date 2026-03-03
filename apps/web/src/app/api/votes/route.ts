/**
 * Route Handler — Votes cooked/uncooked
 *
 * POST /api/votes
 *
 * Accepte { scope, vote: 'cooked'|'uncooked', fingerprint_hash }
 * Contrainte unique : 1 vote/scope/day/fingerprint (voir migration SQL votes_unique_daily)
 *
 * GET /api/votes?scope=global
 *
 * Retourne les comptages publics.
 *
 * TODO (implémentation) :
 *   POST : valider, insérer via createServiceClient(), gérer le conflit unique (upsert ou error 409)
 *   GET  : lire via createReadClient() (anon key, RLS public read)
 *
 * Sécurité : voir docs/security/threat-model.md
 */
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get('scope') ?? 'global'

  // TODO: implémenter la lecture des comptages
  // const supabase = await createReadClient()
  // const { data, error } = await supabase
  //   .from('votes')
  //   .select('vote, count(*)')
  //   .eq('scope', scope)
  //   .groupBy('vote')

  return NextResponse.json(
    { scope, cooked: 0, uncooked: 0, total: 0, error: 'Not implemented yet' },
    { status: 200 },
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>

    if (!body['scope'] || !['cooked', 'uncooked'].includes(body['vote'] as string)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // TODO: implémenter l'insertion
    // const supabase = createServiceClient()
    // await supabase.from('votes').insert({ ... })

    return NextResponse.json({ success: false, error: 'Not implemented yet' }, { status: 501 })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
