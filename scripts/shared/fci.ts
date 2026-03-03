/**
 * French Cooked Index™ v1 — calcul à partir des prix carburants.
 * Voir docs/data/methodology.md et docs/data/pipeline.md.
 */

/** Baselines historiques (prix moyens 2010–2019, €/L) */
export const FCI_BASELINE = {
  gazole: 1.38,
  e10: 1.45,
} as const

/**
 * Mappe une valeur de [inMin, inMax] vers [outMin, outMax] (linéaire, sans clamp).
 */
export function normalize(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const inRange = inMax - inMin
  if (inRange === 0) return outMin
  return ((value - inMin) / inRange) * (outMax - outMin) + outMin
}

/**
 * Calcule le score FCI v1 (0–100) à partir des séries gazole et e10 sur 30 jours.
 * Les tableaux sont ordonnés du plus récent (index 0) au plus ancien.
 *
 * - Score niveau absolu : écart au baseline (0 → 0.80 €/L → 0 → 100)
 * - Score variation 30j : var relative (-10% → +20% → 0 → 100)
 * - Composite : 0.6 × niveau + 0.4 × variation, puis clamp 0–100 et arrondi
 */
export function calcFCIv1(gazole30j: number[], e10_30j: number[]): number {
  const gazoleToday = gazole30j[0] ?? 0
  const e10Today = e10_30j[0] ?? 0
  const gazole30jAgo = gazole30j[29] ?? gazole30j[gazole30j.length - 1] ?? gazoleToday
  const e10_30jAgo = e10_30j[29] ?? e10_30j[e10_30j.length - 1] ?? e10Today

  // 1. Score de niveau absolu (écart par rapport à la baseline 2010–2019)
  const gazoleLevel = normalize(gazoleToday - FCI_BASELINE.gazole, 0, 0.8, 0, 100)
  const e10Level = normalize(e10Today - FCI_BASELINE.e10, 0, 0.8, 0, 100)
  const levelScore = (gazoleLevel + e10Level) / 2

  // 2. Score de variation 30j (variation relative)
  const gazoleVar30 = (gazoleToday - gazole30jAgo) / (gazole30jAgo || 1)
  const e10Var30 = (e10Today - e10_30jAgo) / (e10_30jAgo || 1)
  const varScore = normalize(Math.max(gazoleVar30, e10Var30), -0.1, 0.2, 0, 100)

  // 3. Score carburant composite (60% niveau, 40% variation)
  const fuelScore = 0.6 * levelScore + 0.4 * varScore

  // 4. FCI v1 = clamp 0–100 et arrondi
  return Math.round(Math.max(0, Math.min(100, fuelScore)))
}
