/**
 * Route Handler — Inscription newsletter
 *
 * POST /api/newsletter
 *   Accepte { email, locale?, source?, honeypot? }
 *   - Vérifie le honeypot côté serveur (retourne 200 silencieux si rempli)
 *   - Valide le format email
 *   - Hash l'IP pour l'anti-abus
 *   - Insert via service role (bypass RLS)
 *   - Conflit unique(email) → 200 silencieux (pas d'enum harvesting)
 *
 * Sécurité : voir docs/security/threat-model.md
 */
import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { hashString } from '@/lib/utils'
import type { Database } from '@/lib/supabase/database.types'

// Use createClient<Database> directly (consistent with cron route pattern).
// createServerClient from @supabase/ssr resolves insert types as 'never' in this version.
function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>

    // 1. Honeypot — retour 200 silencieux pour ne pas informer les bots
    const honeypot = body['honeypot']
    if (typeof honeypot === 'string' && honeypot.length > 0) {
      return NextResponse.json({ success: true })
    }

    // 2. Validate email
    const email = body['email']
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    const locale =
      typeof body['locale'] === 'string' && body['locale'].length <= 5 ? body['locale'] : 'fr'
    const source =
      typeof body['source'] === 'string' && body['source'].length <= 50 ? body['source'] : 'homepage'

    // 3. Hash IP server-side
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
    const ipHash = await hashString(ip)
    const userAgent = request.headers.get('user-agent')

    // 4. Insert via service role
    const supabase = getServiceClient()
    const { error } = await supabase.from('newsletter_signups').insert({
      email: email.toLowerCase().trim(),
      locale,
      source,
      ip_hash: ipHash,
      user_agent: userAgent,
    })

    if (error) {
      // Unique constraint (email already exists) → silent 200 to prevent email enumeration
      if (error.code === '23505') {
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
