import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Fusionne les classes Tailwind de façon sûre (shadcn/ui standard)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formate un prix en euros/litre avec 3 décimales
 * ex: formatFuelPrice(1.879) → "1,879 €/L"
 */
export function formatFuelPrice(price: number): string {
  return (
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(price) + '/L'
  )
}

/**
 * Formate une date ISO en date française courte
 * ex: formatDateFR("2024-11-15") → "15 nov. 2024"
 */
export function formatDateFR(isoDate: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate))
}

/**
 * Calcule la variation en pourcentage entre deux valeurs
 */
export function calcVariationPct(current: number, reference: number): number {
  if (reference === 0) return 0
  return ((current - reference) / reference) * 100
}

/**
 * Retourne le label microcopy selon le score FCI
 */
export function getFCILabel(score: number): {
  label: string
  severity: 'ok' | 'warning' | 'danger' | 'cooked'
} {
  if (score < 25) return { label: 'On respire', severity: 'ok' }
  if (score < 50) return { label: 'Ça chauffe', severity: 'warning' }
  if (score < 75) return { label: 'Ça pique', severity: 'danger' }
  return { label: 'On est cooked', severity: 'cooked' }
}

/** Bleu (republic) et rouge (alert) pour le spectre FCI uniquement */
const FCI_BLUE = '#2355EE'
const FCI_RED = '#F43F5E'

/**
 * Couleur FCI : bleu uniquement en "On respire" (score < 25), rouge au-dessus.
 * Évite le violet de l'interpolation ; titre, label et jauge restent bleu ou rouge.
 */
export function getFCIScoreColor(score: number): string {
  return score < 25 ? FCI_BLUE : FCI_RED
}

/**
 * Hash simple pour l'empreinte navigateur (anti-spam MVP)
 * N'utilise pas de données identifiantes directement — juste une empreinte pseudo-anonyme
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
