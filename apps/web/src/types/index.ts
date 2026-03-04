/**
 * Types métier enrichis — France de Macron
 *
 * Ces types sont construits au-dessus des types générés Supabase.
 * Ils représentent les entités telles qu'utilisées dans l'UI.
 */

// =============================================================================
// Carburants
// =============================================================================

/** Codes carburant reconnus par l'API officielle */
export type FuelCode = 'gazole' | 'e10' | 'sp98' | 'e85' | 'gplc' | 'sp95'

/** Agrégat quotidien national pour un carburant */
export interface FuelDailyAgg {
  day: string // ISO date "YYYY-MM-DD"
  fuel_code: FuelCode
  avg_price_eur_per_l: number
  min_price_eur_per_l: number | null
  max_price_eur_per_l: number | null
  sample_count: number | null
}

/** Série temporelle pour un graphique (format Recharts) */
export interface FuelChartDataPoint {
  date: string // "YYYY-MM-DD" (axe X)
  [fuelCode: string]: number | string | null // prix par carburant (axe Y)
}

/** Filtre de période sélectionnable */
export type FuelPeriodFilter = '7j' | '30j' | '90j' | '1an' | '5ans' | 'max'

// =============================================================================
// Événements / annotations
// =============================================================================

export type EventScope = 'fuel' | 'global' | 'inflation' | 'political'
export type EventIcon = 'war' | 'euro' | 'lightning' | 'fire' | 'peace' | 'up' | 'down'

export interface ChartEvent {
  id: string
  day: string
  scope: EventScope
  label_fr: string
  label_en: string | null
  icon: EventIcon | null
  severity: 1 | 2 | 3 | 4 | 5
  source_url: string | null
}

// =============================================================================
// French Cooked Index™
// =============================================================================

/** Composantes du FCI (version 1 : carburants uniquement) */
export interface FCIComponents {
  fuel?: number // Score 0–100 de la composante carburant
  inflation?: number // (futur v2)
  loyers?: number // (futur v2)
  [key: string]: number | undefined
}

/** Poids des composantes (somme = 1.0) */
export interface FCIWeights {
  fuel?: number // 1.0 en v1
  inflation?: number // (futur v2)
  [key: string]: number | undefined
}

export interface FCIDaily {
  day: string
  score: number // 0–100
  methodology_version: string
  components: FCIComponents
  weights: FCIWeights
}

/** Données pour afficher la gauge FCI dans le hero */
export interface FCIHeroData {
  latest: FCIDaily
  previousDay: FCIDaily | null
  trend: 'up' | 'down' | 'stable'
  variation: number // variation absolue vs J-1
}

// =============================================================================
// Votes
// =============================================================================

export type VoteType = 'cooked' | 'uncooked'
export type VoteScope = 'global' | 'fuel' | string

export interface VoteCounts {
  scope: VoteScope
  cooked: number
  uncooked: number
  total: number
  ratio_cooked: number // 0.0 – 1.0
}

// =============================================================================
// Newsletter
// =============================================================================

export interface NewsletterSignupPayload {
  email: string
  locale?: string
  source?: string
  honeypot?: string // Doit être vide (anti-bot)
  fingerprint_hash?: string
}

// =============================================================================
// Réponses API (Server Actions / Route Handlers)
// =============================================================================

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface YouthUnemploymentMonthly {
  month: string
  geo: string
  geo_label: string
  unemployment_rate: number
  unit: string
}
