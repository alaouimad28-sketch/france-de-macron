/**
 * Client Supabase côté navigateur (Client Component)
 *
 * Usage : uniquement dans les 'use client' components qui ont besoin
 * de réactivité temps-réel ou de subscriptions.
 *
 * ⚠️  N'utilise PAS ce client pour des opérations d'écriture sensibles
 *     (newsletter, votes). Ces opérations passent par des Server Actions
 *     qui utilisent createServerClient avec la service role key.
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
    // Ces variables sont publiques (NEXT_PUBLIC_) et safe côté client
    // Elles n'exposent que la lecture via RLS
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
