import { createReadClient } from '@/lib/supabase/server'

interface YouthRow {
  month: string
  geo: string
  geo_label: string
  unemployment_rate: number
}

function formatMonth(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(date))
}

function calcDelta3m(rows: YouthRow[]): number | null {
  if (rows.length < 4) return null
  const latest = rows[rows.length - 1]
  const before = rows[rows.length - 4]
  if (!latest || !before) return null
  return latest.unemployment_rate - before.unemployment_rate
}

export async function YouthUnemploymentSection() {
  const supabase = await createReadClient()
  const { data } = await supabase
    .from('youth_unemployment_monthly')
    .select('month, geo, geo_label, unemployment_rate')
    .in('geo', ['FR', 'EU27_2020'])
    .order('month', { ascending: false })
    .limit(48)

  const rows = (data ?? []) as YouthRow[]
  const fr = rows.filter((r) => r.geo === 'FR').sort((a, b) => a.month.localeCompare(b.month))
  const eu = rows
    .filter((r) => r.geo === 'EU27_2020')
    .sort((a, b) => a.month.localeCompare(b.month))

  const latestFr = fr[fr.length - 1]
  const latestEu = eu[eu.length - 1]

  if (!latestFr || !latestEu) {
    return (
      <section id="jeunesse" className="scroll-mt-24 px-4 py-2.5" aria-label="Chômage jeunes">
        <div className="border-surface-200 mx-auto max-w-4xl rounded-xl border bg-white p-6 text-center shadow-sm">
          <p className="text-surface-600 text-sm">Module chômage jeunes en préparation.</p>
        </div>
      </section>
    )
  }

  const delta3m = calcDelta3m(fr)
  const spread = latestFr.unemployment_rate - latestEu.unemployment_rate

  return (
    <section id="jeunesse" className="scroll-mt-24 px-4 py-2.5" aria-label="Chômage jeunes">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-surface-600 mb-2 font-mono text-xs uppercase tracking-widest">
            Module emploi
          </p>
          <h2 className="font-display text-surface-900 text-3xl font-bold">Chômage jeunes 15–24</h2>
          <p className="text-surface-600 mt-1 text-sm">Source : Eurostat (une_rt_m, mensuel).</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <article className="border-surface-200 rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-surface-600 text-xs uppercase tracking-wide">France</p>
            <p className="text-surface-900 mt-1 font-mono text-2xl font-semibold">
              {latestFr.unemployment_rate.toFixed(1)}%
            </p>
            <p className="text-surface-600 mt-1 text-xs">{formatMonth(latestFr.month)}</p>
          </article>
          <article className="border-surface-200 rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-surface-600 text-xs uppercase tracking-wide">Référence UE-27</p>
            <p className="text-surface-900 mt-1 font-mono text-2xl font-semibold">
              {latestEu.unemployment_rate.toFixed(1)}%
            </p>
            <p className="text-surface-600 mt-1 text-xs">{latestEu.geo_label}</p>
          </article>
          <article className="border-surface-200 rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-surface-600 text-xs uppercase tracking-wide">Écart FR vs UE</p>
            <p
              className={`mt-1 font-mono text-2xl font-semibold ${spread >= 0 ? 'text-alert-500' : 'text-relief-600'}`}
            >
              {spread >= 0 ? '+' : ''}
              {spread.toFixed(1)} pt
            </p>
            <p className="text-surface-600 mt-1 text-xs">
              {delta3m === null
                ? 'Historique insuffisant pour la variation 3 mois.'
                : delta3m > 1
                  ? `Alerte : +${delta3m.toFixed(1)} pt sur 3 mois.`
                  : `Variation 3 mois : ${delta3m >= 0 ? '+' : ''}${delta3m.toFixed(1)} pt.`}
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
