import { computeFCIContributions, resolveFCIMethodVersion } from '@/lib/fci-explainability'
import { createReadClient } from '@/lib/supabase/server'

const LABELS: Record<string, string> = {
  fuel: 'Carburants',
  inflation: 'Inflation',
  loyers: 'Loyers',
}

export async function FCIDecompositionSection() {
  const supabase = await createReadClient()

  const { data: rawRow } = await supabase
    .from('fci_daily')
    .select('*')
    .order('day', { ascending: false })
    .limit(1)
    .maybeSingle()

  const row = rawRow as {
    score: number
    methodology_version?: string | null
    fci_method_version?: string | null
    components: unknown
    weights: unknown
  } | null

  if (!row) {
    return null
  }

  const { contributions } = computeFCIContributions(row.components, row.weights)

  if (contributions.length === 0) {
    return null
  }

  const fciMethodVersion = resolveFCIMethodVersion(row)

  return (
    <section
      id="decomposition"
      aria-labelledby="fci-decomposition-heading"
      className="border-surface-200 mx-auto mt-6 w-full max-w-xl scroll-mt-24 rounded-xl border bg-white p-4 text-left shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3
          id="fci-decomposition-heading"
          className="font-display text-surface-900 text-lg font-semibold"
        >
          Décomposition FCI
        </h3>
        <span className="border-surface-200 text-surface-600 rounded-full border px-2 py-1 font-mono text-[11px]">
          Méthode {fciMethodVersion}
        </span>
      </div>

      <p className="text-surface-600 mb-4 text-xs">
        Score du jour :{' '}
        <span className="text-surface-900 font-mono">{row.score.toFixed(1)} / 100</span>
      </p>

      <ul className="space-y-3">
        {contributions.map((item) => {
          const width = Math.max(4, Math.min(100, item.contribution))
          return (
            <li key={item.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="text-surface-800 font-medium">{LABELS[item.key] ?? item.key}</span>
                <span className="text-surface-600 font-mono">
                  {item.score.toFixed(1)} × {(item.weight * 100).toFixed(0)}% ={' '}
                  {item.contribution.toFixed(1)}
                </span>
              </div>
              <div className="bg-surface-200 h-2 rounded-full">
                <div className="bg-republic-500 h-2 rounded-full" style={{ width: `${width}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
