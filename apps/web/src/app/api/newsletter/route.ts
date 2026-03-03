/**
 * Route Handler — Inscription newsletter
 *
 * POST /api/newsletter
 *
 * Accepte { email, locale?, source?, honeypot?, fingerprint_hash? }
 * Valide côté serveur, vérifie le honeypot, upsert dans Supabase via service role.
 *
 * TODO (implémentation) :
 *   1. Valider le body (zod schema)
 *   2. Vérifier honeypot vide
 *   3. Valider format email
 *   4. Rate-limit par IP (via headers Vercel ou Upstash Redis v2)
 *   5. Insérer via createServiceClient()
 *   6. Retourner { success: true } ou { error: string }
 *
 * Sécurité : voir docs/security/threat-model.md
 */
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>

    // Vérification honeypot (anti-bot)
    if (body['website'] !== '' && body['website'] !== undefined) {
      // Retourner 200 pour ne pas indiquer au bot que c'est un honeypot
      return NextResponse.json({ success: true })
    }

    // TODO: implémenter la validation et l'insertion
    // const parsed = newsletterSchema.safeParse(body)
    // if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    // const supabase = createServiceClient()
    // await supabase.from('newsletter_signups').insert({ email: parsed.data.email, ... })

    return NextResponse.json({ success: false, error: 'Not implemented yet' }, { status: 501 })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
