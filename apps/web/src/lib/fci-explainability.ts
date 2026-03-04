import type { FCIComponents, FCIContribution, FCIWeights } from '@/types'

interface FCIRowLike {
  day?: string
  score?: number
  methodology_version?: string | null
  fci_method_version?: string | null
  components?: unknown
  weights?: unknown
}

export function parseFCINumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>(
    (acc, [key, rawValue]) => {
      if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
        acc[key] = rawValue
      }
      return acc
    },
    {},
  )
}

export function resolveFCIMethodVersion(row: FCIRowLike): string {
  if (typeof row.fci_method_version === 'string' && row.fci_method_version.length > 0) {
    return row.fci_method_version
  }

  if (typeof row.methodology_version === 'string' && row.methodology_version.length > 0) {
    return row.methodology_version
  }

  const components = row.components as Record<string, unknown> | null | undefined
  const nestedVersion = components?.fci_method_version

  if (typeof nestedVersion === 'string' && nestedVersion.length > 0) {
    return nestedVersion
  }

  return 'v1'
}

export function computeFCIContributions(
  componentsInput: unknown,
  weightsInput: unknown,
): {
  components: FCIComponents
  weights: FCIWeights
  contributions: FCIContribution[]
} {
  const components = parseFCINumberRecord(componentsInput) as FCIComponents
  const weights = parseFCINumberRecord(weightsInput) as FCIWeights

  const contributions = Object.entries(components)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .map<FCIContribution>(([key, score]) => {
      const weight = typeof weights[key] === 'number' ? (weights[key] as number) : 0
      return {
        key,
        score,
        weight,
        contribution: Number((score * weight).toFixed(2)),
      }
    })
    .sort((a, b) => b.contribution - a.contribution)

  return { components, weights, contributions }
}

export function buildFCIDecomposition(row: FCIRowLike) {
  const { contributions } = computeFCIContributions(row.components, row.weights)

  return {
    day: row.day ?? '',
    score: typeof row.score === 'number' ? row.score : 0,
    methodologyVersion: resolveFCIMethodVersion(row),
    reconstructedScore: contributions.reduce((sum, item) => sum + item.contribution, 0),
    components: contributions,
  }
}
