/**
 * Client Supabase côté serveur (Server Components + Server Actions + Route Handlers)
 *
 * Deux exports :
 *   - createReadClient()       → anon key + cookies (lecture publique, RLS actif)
 *   - createServiceClient()    → service role key (bypass RLS, écritures sensibles)
 *
 * ⚠️  createServiceClient() ne doit JAMAIS être appelé depuis un Client Component.
 *     La service role key n'est PAS préfixée NEXT_PUBLIC_, donc Next.js ne l'enverra
 *     jamais au navigateur. Vérification défensive ajoutée en bas.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

/**
 * Client en lecture avec la clé anonyme.
 * À utiliser dans les Server Components pour fetcher les données publiques.
 */
export async function createReadClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(
          cookiesToSet: Array<{
            name: string
            value: string
            options?: Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2]
          }>,
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options ?? {}),
            )
          } catch {
            // Ignoré en Server Component (pas de set possible)
          }
        },
      },
    },
  )
}

/**
 * Client avec la service role key (bypass RLS).
 * À utiliser UNIQUEMENT dans les Server Actions et Route Handlers
 * pour les opérations d'écriture (newsletter, votes).
 *
 * Vérification défensive : lance une erreur si appelé côté client.
 */
export function createServiceClient() {
  if (typeof window !== 'undefined') {
    throw new Error(
      '[Security] createServiceClient() ne peut pas être appelé côté client. ' +
        'Utiliser uniquement dans les Server Actions / Route Handlers.',
    )
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error("[Config] SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d'environnement.")
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
