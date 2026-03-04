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
import { z } from 'zod'
import { hashString } from '@/lib/utils'
import type { Database } from '@/lib/supabase/database.types'
import type { VoteCounts } from '@/types'

function getClient(serviceRole = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient<Database>(url, key)
}

const VALID_SCOPES = ['global', 'fuel', 'inflation', 'loyers'] as const
const VALID_VOTES = ['cooked', 'uncooked'] as const
const VOTES_PER_IP_PER_HOUR = 10

const voteBodySchema = z.object({
  scope: z.enum(VALID_SCOPES),
  vote: z.enum(VALID_VOTES),
  fingerprint_hash: z.string().trim().min(1).max(128),
})

async function isVoteRateLimited(ipHash: string): Promise<boolean> {
  const supabase = getClient(true)
  const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', oneHourAgoIso)

  if (error) {
    throw new Error(`Votes rate-limit query failed: ${error.message}`)
  }

  return (count ?? 0) >= VOTES_PER_IP_PER_HOUR
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
}

async function getCounts(scope: (typeof VALID_SCOPES)[number]): Promise<VoteCounts> {
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
  const scopeParam = request.nextUrl.searchParams.get('scope') ?? 'global'
  const parsedScope = z.enum(VALID_SCOPES).safeParse(scopeParam)

  if (!parsedScope.success) {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
  }

  try {
    const counts = await getCounts(parsedScope.data)
    return NextResponse.json(counts)
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = (await request.json()) as unknown
    const parsedBody = voteBodySchema.safeParse(rawBody)

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { scope, vote, fingerprint_hash: fingerprintHash } = parsedBody.data

    const ip = getClientIp(request)
    const ipHash = await hashString(ip)

    if (await isVoteRateLimited(ipHash)) {
      return NextResponse.json({ error: 'Too many votes from this IP' }, { status: 429 })
    }

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
