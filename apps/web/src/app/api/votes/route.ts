/**
 * Route Handler — Votes cooked/uncooked
 *
 * GET /api/votes?scope=global
 *   Retourne les comptages publics { scope, cooked, uncooked, total, ratio_cooked }
 *
 * POST /api/votes
 *   Accepte { scope, vote: 'cooked'|'uncooked', fingerprint_hash }
 *   Contrainte unique : 1 vote/scope/day/fingerprint (migration votes_unique_daily)
 *   409 si déjà voté. Retourne les nouveaux comptages.
 *
 * Sécurité : voir docs/security/threat-model.md
 */
import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { hashString } from '@/lib/utils'
import type { Database } from '@/lib/supabase/database.types'
import type { VoteCounts } from '@/types'

// Use createClient<Database> directly (consistent with cron route pattern).
// createServerClient from @supabase/ssr resolves insert types as 'never' in this version.
function getClient(serviceRole = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient<Database>(url, key)
}

const VALID_SCOPES = ['global', 'fuel', 'inflation', 'loyers'] as const
const VALID_VOTES = ['cooked', 'uncooked'] as const

async function getCounts(scope: string): Promise<VoteCounts> {
  const supabase = getClient(false)

  const [cookedResult, uncookedResult] = await Promise.all([
    supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('scope', scope)
      .eq('vote', 'cooked'),
    supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('scope', scope)
      .eq('vote', 'uncooked'),
  ])

  const cooked = cookedResult.count ?? 0
  const uncooked = uncookedResult.count ?? 0
  const total = cooked + uncooked

  return {
    scope,
    cooked,
    uncooked,
    total,
    ratio_cooked: total > 0 ? cooked / total : 0,
  }
}

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get('scope') ?? 'global'

  try {
    const counts = await getCounts(scope)
    return NextResponse.json(counts)
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>

    const scope = body['scope']
    const vote = body['vote']
    const fingerprintHash = body['fingerprint_hash']

    // Validate
    if (
      typeof scope !== 'string' ||
      !VALID_SCOPES.includes(scope as (typeof VALID_SCOPES)[number]) ||
      typeof vote !== 'string' ||
      !VALID_VOTES.includes(vote as (typeof VALID_VOTES)[number]) ||
      typeof fingerprintHash !== 'string' ||
      fingerprintHash.length === 0
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Hash IP server-side
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
    const ipHash = await hashString(ip)
    const userAgent = request.headers.get('user-agent')

    // Insert via service role (bypasses RLS)
    const supabase = getClient(true)
    const { error } = await supabase.from('votes').insert({
      scope,
      vote,
      fingerprint_hash: fingerprintHash,
      ip_hash: ipHash,
      user_agent: userAgent,
    })

    if (error) {
      // Unique constraint violation → already voted
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already voted today' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    // Return fresh counts after successful vote
    const counts = await getCounts(scope)
    return NextResponse.json(counts, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
