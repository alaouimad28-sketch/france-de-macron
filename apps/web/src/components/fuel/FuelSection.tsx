/**
 * FuelSection — Server Component : module carburants J-90
 *
 * Fetch les 90 derniers jours de fuel_daily_agg (gazole, e10, sp98)
 * et les événements de type 'fuel', puis passe les données à FuelChart.
 * Les périodes plus longues (1an, 5ans, max) sont fetchées côté client
 * via /api/fuel.
 */

import { createReadClient } from '@/lib/supabase/server'
import { calcVariationPct, formatFuelPrice } from '@/lib/utils'
import type { ChartEvent, FuelChartDataPoint, FuelCode } from '@/types'
import { FuelChart } from './FuelChart'

const DISPLAYED_FUELS: FuelCode[] = ['gazole', 'e10', 'sp98']

const FUEL_LABELS: Record<string, string> = {
  gazole: 'Gazole',
  e10: 'E10 (SP95-E10)',
  sp98: 'SP98',
}

const FUEL_COLORS: Record<string, string> = {
  gazole: '#2563EB',
  e10: '#16A34A',
  sp98: '#D97706',
}

interface LatestPrice {
  fuelCode: string
  price: number
  variationVs7d: number | null
}

function getTrendLabel(prices: LatestPrice[]): string {
  const avgVariation =
    prices
      .filter((p) => p.variationVs7d !== null)
      .reduce((sum, p) => sum + (p.variationVs7d ?? 0), 0) / prices.length

  if (avgVariation > 3) return '📈 En forte hausse sur 7 jours'
  if (avgVariation > 0.5) return '↗ En légère hausse sur 7 jours'
  if (avgVariation < -3) return '📉 En forte baisse sur 7 jours'
  if (avgVariation < -0.5) return '↘ En légère baisse sur 7 jours'
  return '→ Relativement stable sur 7 jours'
}

export async function FuelSection() {
  const supabase = await createReadClient()

  // Fetch 90 derniers jours (couvre 7j, 30j, 90j sans fetch client)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const fromDate = ninetyDaysAgo.toISOString().slice(0, 10)

  const [fuelResult, eventsResult] = await Promise.all([
    supabase
      .from('fuel_daily_agg')
      .select('day, fuel_code, avg_price_eur_per_l')
      .gte('day', fromDate)
      .in('fuel_code', DISPLAYED_FUELS)
      .order('day', { ascending: true }),
    supabase
      .from('events')
      .select('id, day, scope, label_fr, label_en, icon, severity, source_url')
      .eq('scope', 'fuel')
      .gte('day', fromDate),
  ])

  // Type assertions — createServerClient@0.5.1 resolves select result as never[]
  const fuelRows = (fuelResult.data ?? []) as Array<{
    day: string
    fuel_code: string
    avg_price_eur_per_l: number
  }>
  const eventRows = (eventsResult.data ?? []) as ChartEvent[]

  if (fuelRows.length === 0) {
    return (
      <section
        id="carburants"
        aria-label="Prix des carburants"
        className="px-4 py-2.5 text-center"
      >
        <p className="text-sm text-surface-600">Données carburants indisponibles pour le moment.</p>
      </section>
    )
  }

  // Pivot : rows → { date, gazole, e10, sp98 }[]
  const byDate = new Map<string, FuelChartDataPoint>()
  for (const row of fuelRows) {
    if (!byDate.has(row.day)) byDate.set(row.day, { date: row.day })
    const entry = byDate.get(row.day)!
    entry[row.fuel_code] = row.avg_price_eur_per_l
  }
  const chartData = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))

  // Prix les plus récents + variation vs J-7
  const latest = chartData[chartData.length - 1]
  const sevenDaysIndex = Math.max(0, chartData.length - 8)
  const sevenDaysAgo = chartData[sevenDaysIndex]

  const latestPrices: LatestPrice[] = DISPLAYED_FUELS.map((fuelCode) => {
    const price = latest ? (latest[fuelCode] as number | undefined) : undefined
    const oldPrice = sevenDaysAgo ? (sevenDaysAgo[fuelCode] as number | undefined) : undefined
    return {
      fuelCode,
      price: price ?? 0,
      variationVs7d:
        price !== undefined && oldPrice !== undefined
          ? calcVariationPct(price, oldPrice)
          : null,
    }
  }).filter((p) => p.price > 0)

  const trendLabel = getTrendLabel(latestPrices)
  const latestDay = latest?.date ?? ''
  const formattedDate = latestDay
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(latestDay))
    : ''

  return (
    <section
      id="carburants"
      aria-label="Prix des carburants"
      className="px-4 py-2.5"
    >
      <div className="mx-auto max-w-4xl">
        {/* En-tête section */}
        <div className="mb-8">
          <p className="mb-2 font-mono text-xs tracking-widest text-surface-600 uppercase">
            Module carburants
          </p>
          <h2 className="font-display text-3xl font-bold text-surface-900">
            Prix à la pompe
          </h2>
          {formattedDate && (
            <p className="mt-1 text-sm text-surface-600">Dernière donnée : {formattedDate}</p>
          )}
        </div>

        {/* Badges prix actuels */}
        <div className="mb-6 flex flex-wrap gap-3">
          {latestPrices.map(({ fuelCode, price, variationVs7d }) => {
            const variationSign = variationVs7d === null ? null : variationVs7d > 0 ? '+' : ''
            const variationColor =
              variationVs7d === null
                ? 'text-surface-500'
                : variationVs7d > 1
                  ? 'text-alert-500'
                  : variationVs7d < -1
                    ? 'text-relief-600'
                    : 'text-surface-600'

            return (
              <div
                key={fuelCode}
                className="rounded-xl border border-surface-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: FUEL_COLORS[fuelCode] }}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium text-surface-600">
                    {FUEL_LABELS[fuelCode]}
                  </span>
                </div>
                <p className="font-mono text-xl font-semibold text-surface-800">
                  {formatFuelPrice(price)}
                </p>
                {variationVs7d !== null && (
                  <p className={`mt-0.5 font-mono text-xs ${variationColor}`}>
                    {variationSign}{variationVs7d.toFixed(1)}% vs 7j
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Tendance */}
        <p className="mb-6 text-sm text-surface-600">{trendLabel}</p>

        {/* Graphique */}
        <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-sm md:p-6">
          <FuelChart data={chartData} events={eventRows} />
        </div>

        {/* Source */}
        <p className="mt-3 text-xs text-surface-600">
          Source : données officielles open data (roulez-eco.fr). Moyennes nationales.
        </p>
      </div>
    </section>
  )
}
