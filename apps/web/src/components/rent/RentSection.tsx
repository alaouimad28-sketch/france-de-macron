import { createReadClient } from '@/lib/supabase/server'

interface RentRow {
  month: string
  city: string
  city_label: string
  avg_rent_m2: number
}

const CITIES = ['paris', 'lyon', 'marseille', 'lille', 'toulouse'] as const

function formatRent(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €/m²`
}

function formatMonth(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(date))
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export async function RentSection() {
  const supabase = await createReadClient()

  const { data } = await supabase
    .from('rent_monthly')
    .select('month, city, city_label, avg_rent_m2')
    .in('city', CITIES as unknown as string[])
    .order('month', { ascending: false })
    .limit(120)

  const rows = (data ?? []) as RentRow[]

  if (rows.length === 0) {
    return (
      <section
        id="loyers"
        aria-labelledby="loyers-heading"
        className="scroll-mt-24 px-4 py-12 md:py-16"
      >
        <div className="border-surface-200 mx-auto max-w-4xl rounded-xl border bg-white p-6 text-center shadow-sm">
          <h2 id="loyers-heading" className="font-display text-surface-900 mb-2 text-2xl font-bold">
            Loyers — 5 villes
          </h2>
          <p className="text-surface-600 text-sm">
            Module loyers en préparation : les données seront visibles ici après le backfill.
          </p>
        </div>
      </section>
    )
  }

  // Build per-city: latest month + year-ago month for variation
  interface CityStats {
    city: string
    city_label: string
    latestMonth: string
    latestRent: number
    yearAgoRent: number | null
    yoy: number | null
  }

  const cityStats: CityStats[] = CITIES.flatMap((city) => {
    const cityRows = rows
      .filter((r) => r.city === city)
      .sort((a, b) => a.month.localeCompare(b.month))

    const latest = cityRows[cityRows.length - 1]
    if (!latest) return []

    const yearAgoDate = new Date(`${latest.month}T00:00:00.000Z`)
    yearAgoDate.setUTCFullYear(yearAgoDate.getUTCFullYear() - 1)
    const yearAgoMonth = yearAgoDate.toISOString().slice(0, 10)

    const yearAgoRow = cityRows.find((r) => r.month === yearAgoMonth)
    const yoy =
      yearAgoRow && yearAgoRow.avg_rent_m2 > 0
        ? ((latest.avg_rent_m2 - yearAgoRow.avg_rent_m2) / yearAgoRow.avg_rent_m2) * 100
        : null

    return [
      {
        city,
        city_label: latest.city_label,
        latestMonth: latest.month,
        latestRent: latest.avg_rent_m2,
        yearAgoRent: yearAgoRow?.avg_rent_m2 ?? null,
        yoy,
      },
    ]
  })

  // Find max rent for bar chart scale
  const maxRent = Math.max(...cityStats.map((c) => c.latestRent))
  const referenceMonth = cityStats[0]?.latestMonth

  return (
    <section
      id="loyers"
      aria-labelledby="loyers-heading"
      className="scroll-mt-24 px-4 py-12 md:py-16"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-surface-600 mb-2 font-mono text-xs uppercase tracking-widest">
            Module logement
          </p>
          <h2 id="loyers-heading" className="font-display text-surface-900 text-3xl font-bold">
            Loyers — 5 grandes villes
          </h2>
          <p className="text-surface-600 mt-1 text-sm">
            Loyer moyen au m² (secteur privé, hors charges). Source : CLAMEUR / OLAP data.gouv.fr.
            {referenceMonth ? ` Données : ${formatMonth(referenceMonth)}.` : ''}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cityStats.map((stat) => {
            const barWidth = maxRent > 0 ? (stat.latestRent / maxRent) * 100 : 0
            const yoyPositive = stat.yoy !== null && stat.yoy >= 0

            return (
              <article
                key={stat.city}
                className="border-surface-200 rounded-xl border bg-white p-4 shadow-sm"
              >
                <p className="text-surface-800 mb-1 font-semibold">{stat.city_label}</p>

                {/* Bar chart visual */}
                <div className="bg-surface-100 mb-3 h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-republic-500 h-2 rounded-full transition-all duration-700"
                    style={{ width: `${barWidth}%` }}
                    aria-hidden="true"
                  />
                </div>

                <p className="text-surface-900 font-mono text-xl font-semibold">
                  {formatRent(stat.latestRent)}
                </p>

                {stat.yoy !== null ? (
                  <p
                    className={`mt-1 text-xs font-medium ${
                      yoyPositive ? 'text-alert-500' : 'text-relief-600'
                    }`}
                  >
                    {formatPercent(stat.yoy)} sur 1 an
                  </p>
                ) : (
                  <p className="text-surface-500 mt-1 text-xs">Variation N/A</p>
                )}
              </article>
            )
          })}
        </div>

        <p className="text-surface-500 mt-4 text-xs">
          Données indicatives — moyennes annuelles normalisées. Pour une analyse fine, consulter les
          observatoires locaux des loyers.
        </p>
      </div>
    </section>
  )
}
