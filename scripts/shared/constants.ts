export const FUEL_CODES = new Set(['gazole', 'e10', 'sp98', 'e85', 'gplc', 'sp95'])
export const MIN_PRICE = 0.5
export const MAX_PRICE = 5.0

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

export const FETCH_TIMEOUT_MS = 30_000
export const RETRY_DELAYS_MS = [1000, 5000, 30_000] as const
