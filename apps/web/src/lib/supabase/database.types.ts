/**
 * Types TypeScript générés depuis le schéma Supabase.
 *
 * ⚠️  CE FICHIER EST AUTO-GÉNÉRÉ — ne pas modifier manuellement.
 *
 * Pour régénérer après une migration :
 *   supabase gen types typescript --local > apps/web/src/lib/supabase/database.types.ts
 *
 * Types enrichis manuellement disponibles dans @/types/index.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      data_sources: {
        Row: {
          id: string
          key: string
          name: string
          url: string
          license: string | null
          update_frequency: string | null
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          url: string
          license?: string | null
          update_frequency?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          url?: string
          license?: string | null
          update_frequency?: string | null
          created_at?: string
        }
      }
      fuel_daily_agg: {
        Row: {
          day: string
          fuel_code: string
          avg_price_eur_per_l: number
          min_price_eur_per_l: number | null
          max_price_eur_per_l: number | null
          sample_count: number | null
          source_id: string | null
          created_at: string
        }
        Insert: {
          day: string
          fuel_code: string
          avg_price_eur_per_l: number
          min_price_eur_per_l?: number | null
          max_price_eur_per_l?: number | null
          sample_count?: number | null
          source_id?: string | null
          created_at?: string
        }
        Update: {
          day?: string
          fuel_code?: string
          avg_price_eur_per_l?: number
          min_price_eur_per_l?: number | null
          max_price_eur_per_l?: number | null
          sample_count?: number | null
          source_id?: string | null
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          day: string
          scope: string
          label_fr: string
          label_en: string | null
          icon: string | null
          severity: number | null
          source_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          day: string
          scope: string
          label_fr: string
          label_en?: string | null
          icon?: string | null
          severity?: number | null
          source_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          day?: string
          scope?: string
          label_fr?: string
          label_en?: string | null
          icon?: string | null
          severity?: number | null
          source_url?: string | null
          created_at?: string
        }
      }
      newsletter_signups: {
        Row: {
          id: string
          email: string
          locale: string | null
          source: string | null
          created_at: string
          fingerprint_hash: string | null
          user_agent: string | null
          ip_hash: string | null
        }
        Insert: {
          id?: string
          email: string
          locale?: string | null
          source?: string | null
          created_at?: string
          fingerprint_hash?: string | null
          user_agent?: string | null
          ip_hash?: string | null
        }
        Update: {
          id?: string
          email?: string
          locale?: string | null
          source?: string | null
          created_at?: string
          fingerprint_hash?: string | null
          user_agent?: string | null
          ip_hash?: string | null
        }
      }
      votes: {
        Row: {
          id: string
          scope: string
          vote: 'cooked' | 'uncooked'
          created_at: string
          fingerprint_hash: string
          ip_hash: string | null
          user_agent: string | null
          day: string
        }
        Insert: {
          id?: string
          scope: string
          vote: 'cooked' | 'uncooked'
          created_at?: string
          fingerprint_hash: string
          ip_hash?: string | null
          user_agent?: string | null
          day?: string
        }
        Update: {
          id?: string
          scope?: string
          vote?: 'cooked' | 'uncooked'
          created_at?: string
          fingerprint_hash?: string
          ip_hash?: string | null
          user_agent?: string | null
          day?: string
        }
      }
      fci_daily: {
        Row: {
          day: string
          score: number
          methodology_version: string
          components: Json
          weights: Json
          created_at: string
        }
        Insert: {
          day: string
          score: number
          methodology_version?: string
          components?: Json
          weights?: Json
          created_at?: string
        }
        Update: {
          day?: string
          score?: number
          methodology_version?: string
          components?: Json
          weights?: Json
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      vote_type: 'cooked' | 'uncooked'
    }
  }
}
