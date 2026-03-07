import { ipcToBase2015 } from '@/lib/ipc'
import { createReadClient } from '@/lib/supabase/server'
import type { IpcFoodChartPoint } from '@/types'
import { FoodInflationChart } from './FoodInflationChart'

interface IpcFoodRow {
  month: string
  index_value: number
}

function formatMonth(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(date))
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export async function FoodInflationSection() {
  const supabase = await createReadClient()

  const { data } = await supabase
    .from('ipc_food_monthly')
    .select('month, index_value')
    .order('month', { ascending: false })
    .limit(24)

  const rows = ((data ?? []) as IpcFoodRow[]).sort((a, b) => a.month.localeCompare(b.month))
  const latest = rows[rows.length - 1]

  if (!latest) {
    return (
      <section
        id="alimentation"
        aria-labelledby="alimentation-heading"
        className="scroll-mt-24 px-4 py-12 md:py-16"
      >
        <div className="border-surface-200 mx-auto max-w-4xl rounded-xl border bg-white p-6 text-center shadow-sm">
          <h2
            id="alimentation-heading"
            className="font-display text-surface-900 mb-2 text-2xl font-bold"
          >
            Panier alimentaire
          </h2>
          <p className="text-surface-600 text-sm">
            Module alimentation en préparation : les données IPC INSEE seront visibles ici.
          </p>
        </div>
      </section>
    )
  }

  const yearBackDate = new Date(`${latest.month}T00:00:00.000Z`)
  yearBackDate.setUTCMonth(yearBackDate.getUTCMonth() - 12)
  const yearBackMonth = yearBackDate.toISOString().slice(0, 10)

  const previousYear = rows.find((row) => row.month === yearBackMonth)
  const yoy =
    previousYear && previousYear.index_value > 0
      ? ((latest.index_value - previousYear.index_value) / previousYear.index_value) * 100
      : null

  const firstRow = rows[0]
  if (!firstRow) {
    return null
  }

  const maxRow = rows.reduce(
    (acc, row) => (row.index_value > acc.index_value ? row : acc),
    firstRow,
  )
  const minRow = rows.reduce(
    (acc, row) => (row.index_value < acc.index_value ? row : acc),
    firstRow,
  )

  // Rebasement base 2025 → base 2015 pour affichage et courbe
  const latestBase2015 = ipcToBase2015(latest.index_value)
  const minBase2015 = ipcToBase2015(minRow.index_value)
  const maxBase2015 = ipcToBase2015(maxRow.index_value)
  const chartData: IpcFoodChartPoint[] = rows.map((row) => ({
    month: row.month,
    index_value: ipcToBase2015(row.index_value),
  }))

  return (
    <section
      id="alimentation"
      aria-labelledby="alimentation-heading"
      className="scroll-mt-24 px-4 py-12 md:py-16"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-surface-600 mb-2 font-mono text-xs uppercase tracking-widest">
            Module alimentation
          </p>
          <h2
            id="alimentation-heading"
            className="font-display text-surface-900 text-3xl font-bold"
          >
            Panier alimentaire
          </h2>
          <p className="text-surface-600 mt-1 text-sm">
            Source : INSEE IPC alimentaire (mensuel). Indice affiché en base 2015 (100 = année 2015).
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <article className="border-surface-200 rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-surface-600 text-xs uppercase tracking-wide">Dernier indice</p>
            <p className="text-surface-900 mt-1 font-mono text-2xl font-semibold">
              {latestBase2015.toFixed(1)}
            </p>
            <p className="text-surface-600 mt-1 text-xs">{formatMonth(latest.month)}</p>
          </article>

          <article className="border-surface-200 rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-surface-600 text-xs uppercase tracking-wide">Variation 12 mois</p>
            <p
              className={`mt-1 font-mono text-2xl font-semibold ${
                yoy === null ? 'text-surface-700' : yoy >= 0 ? 'text-alert-500' : 'text-relief-600'
              }`}
            >
              {yoy === null ? 'N/A' : formatPercent(yoy)}
            </p>
            <p className="text-surface-600 mt-1 text-xs">
              {previousYear ? `vs ${formatMonth(previousYear.month)}` : 'historique insuffisant'}
            </p>
          </article>

          <article className="border-surface-200 rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-surface-600 text-xs uppercase tracking-wide">Fenêtre 24 mois</p>
            <p className="text-surface-900 mt-1 text-sm">
              Min {minBase2015.toFixed(1)} ({formatMonth(minRow.month)})
            </p>
            <p className="text-surface-900 mt-1 text-sm">
              Max {maxBase2015.toFixed(1)} ({formatMonth(maxRow.month)})
            </p>
          </article>
        </div>

        <div className="border-surface-200 mt-6 rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-surface-700 mb-3 font-mono text-xs font-semibold uppercase tracking-wider">
            Évolution sur 24 mois
          </h3>
          <FoodInflationChart data={chartData} />
        </div>
      </div>
    </section>
  )
}
