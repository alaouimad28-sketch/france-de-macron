import { createReadClient } from '@/lib/supabase/server'
import type { ChartEvent } from '@/types'

interface ElectricityPoint {
  effective_date: string
  value_ct_kwh: number
  value_eur_kwh: number
  source_url: string
}

interface TimelineItem {
  effectiveDate: string
  valueCtKwh: number
  deltaPct: number | null
  linkedEvent: ChartEvent | null
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

function formatDelta(deltaPct: number): string {
  const sign = deltaPct > 0 ? '+' : ''
  return `${sign}${deltaPct.toFixed(1)}%`
}

export async function ElectricityTariffSection() {
  const supabase = await createReadClient()

  const tariffResult = await supabase
    .from('electricity_tariff_history')
    .select('effective_date, value_ct_kwh, value_eur_kwh, source_url')
    .eq('option_code', 'BASE')
    .eq('subscribed_power_kva', 6)
    .eq('tariff_component', 'BASE')
    .order('effective_date', { ascending: true })

  const tariffRows = (tariffResult.data ?? []) as ElectricityPoint[]

  if (tariffRows.length === 0) {
    return (
      <section id="electricite" className="scroll-mt-24 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-surface-900 text-3xl font-bold">Électricité (TRVE)</h2>
          <p className="text-surface-600 mt-3 text-sm">
            Données TRVE indisponibles pour le moment.
          </p>
        </div>
      </section>
    )
  }

  const firstDate = tariffRows[0]!.effective_date
  const lastDate = tariffRows[tariffRows.length - 1]!.effective_date

  const eventsResult = await supabase
    .from('events')
    .select('id, day, scope, label_fr, label_en, icon, severity, source_url')
    .eq('scope', 'electricity')
    .gte('day', firstDate)
    .lte('day', lastDate)

  const eventRows = (eventsResult.data ?? []) as ChartEvent[]

  const timeline: TimelineItem[] = tariffRows.map((row, index) => {
    const previous = index > 0 ? tariffRows[index - 1] : null
    const deltaPct = previous
      ? ((row.value_ct_kwh - previous.value_ct_kwh) / previous.value_ct_kwh) * 100
      : null
    const linkedEvent = eventRows.find((event) => event.day === row.effective_date) ?? null

    return {
      effectiveDate: row.effective_date,
      valueCtKwh: row.value_ct_kwh,
      deltaPct,
      linkedEvent,
    }
  })

  const latest = timeline[timeline.length - 1]!
  const previous = timeline.length > 1 ? timeline[timeline.length - 2] : null

  return (
    <section
      id="electricite"
      aria-labelledby="electricite-heading"
      className="scroll-mt-24 px-4 py-12 md:py-16"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-surface-600 mb-2 font-mono text-xs uppercase tracking-widest">
            Module énergie domestique
          </p>
          <h2 id="electricite-heading" className="font-display text-surface-900 text-3xl font-bold">
            Électricité (TRVE Base 6 kVA)
          </h2>
          <p className="text-surface-600 mt-2 text-sm">
            Tarif actuel :{' '}
            <span className="text-surface-900 font-mono font-semibold">
              {latest.valueCtKwh.toFixed(3)} ct€/kWh
            </span>{' '}
            {previous && latest.deltaPct !== null ? (
              <span className={latest.deltaPct >= 0 ? 'text-alert-500' : 'text-relief-600'}>
                ({formatDelta(latest.deltaPct)} vs précédent)
              </span>
            ) : null}
          </p>
        </div>

        <div className="border-surface-200 rounded-xl border bg-white p-4 shadow-sm md:p-6">
          <ol className="space-y-3">
            {timeline
              .slice(-8)
              .reverse()
              .map((item) => (
                <li key={item.effectiveDate} className="border-surface-200 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-surface-800 text-sm font-medium">
                      {formatDate(item.effectiveDate)}
                    </p>
                    <p className="text-surface-900 font-mono text-sm font-semibold">
                      {item.valueCtKwh.toFixed(3)} ct€/kWh
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {item.deltaPct !== null && (
                      <span className={item.deltaPct >= 0 ? 'text-alert-500' : 'text-relief-600'}>
                        {formatDelta(item.deltaPct)}
                      </span>
                    )}
                    {item.linkedEvent ? (
                      <span className="bg-surface-100 text-surface-700 rounded-full px-2 py-0.5">
                        Événement : {item.linkedEvent.label_fr}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
          </ol>
        </div>

        <p className="text-surface-600 mt-3 text-xs">
          Source : CRE / data.gouv (TRVE). Les événements marqués proviennent de la timeline
          éditoriale.
        </p>
      </div>
    </section>
  )
}
