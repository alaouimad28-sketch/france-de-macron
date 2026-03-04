/**
 * Route Handler — Inscription newsletter
 *
 * POST /api/newsletter
 *   Accepte { email, locale?, source?, honeypot? }
 *   - Vérifie le honeypot côté serveur (retourne 200 silencieux si rempli)
 *   - Valide le payload avec Zod
 *   - Applique un rate limit IP (max 3 inscriptions / heure)
 *   - Insert via service role (bypass RLS)
 *   - Conflit unique(email) → 200 silencieux (pas d'enum harvesting)
 *
 * Sécurité : voir docs/security/threat-model.md
 */
import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hashString } from '@/lib/utils'
import type { Database } from '@/lib/supabase/database.types'

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const NEWSLETTER_SIGNUPS_PER_HOUR = 3

const newsletterBodySchema = z.object({
  email: z.string().trim().email().max(320),
  locale: z.enum(['fr', 'en']).optional().default('fr'),
  source: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9:_/-]+$/)
    .optional()
    .default('homepage'),
  honeypot: z.string().optional().default(''),
})

async function isNewsletterRateLimited(ipHash: string): Promise<boolean> {
  const supabase = getServiceClient()
  const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('newsletter_signups')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', oneHourAgoIso)

  if (error) {
    throw new Error(`Newsletter rate-limit query failed: ${error.message}`)
  }

  return (count ?? 0) >= NEWSLETTER_SIGNUPS_PER_HOUR
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = (await request.json()) as unknown
    const parsedBody = newsletterBodySchema.safeParse(rawBody)

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { email, locale, source, honeypot } = parsedBody.data

    // Honeypot — retour 200 silencieux pour ne pas informer les bots
    if (honeypot.trim().length > 0) {
      return NextResponse.json({ success: true })
    }

    const ip = getClientIp(request)
    const ipHash = await hashString(ip)

    // Rate-limit soft : réponse silencieuse pour limiter l'oracle anti-bot
    if (await isNewsletterRateLimited(ipHash)) {
      return NextResponse.json({ success: true })
    }

    const userAgent = request.headers.get('user-agent')

    const supabase = getServiceClient()
    const { error } = await supabase.from('newsletter_signups').insert({
      email: email.toLowerCase(),
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
