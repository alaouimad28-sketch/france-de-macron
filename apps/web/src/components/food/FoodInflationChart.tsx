'use client'

/**
 * FoodInflationChart — Courbe IPC alimentaire (base 2015)
 * Périodes : 24 mois, 5 ans, 10 ans, MAX (fetch API pour 5ans/10ans/max)
 */

import { useCallback, useMemo, useState } from 'react'
import type { TooltipProps } from 'recharts'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { IpcFoodChartPoint, IpcFoodPeriodFilter } from '@/types'

const LINE_COLOR = '#f59e0b' // warning-500

const PERIODS: { value: IpcFoodPeriodFilter; label: string }[] = [
  { value: '24m', label: '24 mois' },
  { value: '5ans', label: '5 ans' },
  { value: '10ans', label: '10 ans' },
  { value: 'max', label: 'Max' },
]

function formatXAxisDate(monthStr: string, period: IpcFoodPeriodFilter): string {
  const d = new Date(`${monthStr}T00:00:00.000Z`)
  if (period === '10ans' || period === 'max') {
    return new Intl.DateTimeFormat('fr-FR', { year: 'numeric' }).format(d)
  }
  if (period === '5ans') {
    return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(d)
  }
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(d)
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length || label == null) return null
  const date = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${label}T00:00:00.000Z`))
  const pct = payload[0]?.value as number | undefined
  const indexValue = (payload[0]?.payload as { index_value?: number })?.index_value
  return (
    <div className="border-surface-200 min-w-[160px] rounded-lg border bg-white p-3 text-sm shadow-lg">
      <p className="text-surface-600 mb-2 font-mono text-xs">{date}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-surface-600">Vs base 2015</span>
        <span className="font-mono font-semibold" style={{ color: LINE_COLOR }}>
          {typeof pct === 'number' ? formatPct(pct) : '—'}
        </span>
      </div>
      {typeof indexValue === 'number' && (
        <p className="text-surface-500 mt-1 text-xs">Indice {indexValue.toFixed(1)}</p>
      )}
    </div>
  )
}

export interface FoodInflationChartProps {
  /** Données initiales (24 mois) fournies par le serveur */
  data: IpcFoodChartPoint[]
}

export function FoodInflationChart({ data: initialData }: FoodInflationChartProps) {
  const [period, setPeriod] = useState<IpcFoodPeriodFilter>('24m')
  const [extendedData, setExtendedData] = useState<IpcFoodChartPoint[] | null>(null)
  const [isLoadingExtended, setIsLoadingExtended] = useState(false)

  const handlePeriodChange = useCallback(async (newPeriod: IpcFoodPeriodFilter) => {
    setPeriod(newPeriod)
    if (newPeriod === '24m') {
      setExtendedData(null)
      return
    }
    setIsLoadingExtended(true)
    try {
      const res = await fetch(`/api/ipc-food?period=${newPeriod}`)
      if (!res.ok) throw new Error('Failed')
      const nextData = (await res.json()) as IpcFoodChartPoint[]
      setExtendedData(nextData)
    } catch {
      setExtendedData(null)
    } finally {
      setIsLoadingExtended(false)
    }
  }, [])

  const activeData = extendedData ?? initialData
  const filteredData = useMemo(() => {
    if (period === '24m') return activeData.slice(-24)
    return activeData
  }, [activeData, period])

  /** Données pour le graphique : indice → % vs 2015 (100 = 0%) */
  const chartData = useMemo(
    () => filteredData.map((d) => ({ ...d, pct: d.index_value - 100 })),
    [filteredData],
  )

  if (chartData.length === 0 && !isLoadingExtended) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-surface-600 text-sm">Aucune donnée disponible.</p>
      </div>
    )
  }

  const xFormatter = (monthStr: string) => formatXAxisDate(monthStr, period)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Période du graphique">
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={period === value}
            aria-label={`Période ${label}`}
            onClick={() => void handlePeriodChange(value)}
            className={[
              'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150',
              'focus-visible:ring-republic-500 focus-visible:outline-none focus-visible:ring-2',
              period === value
                ? 'bg-republic-500 text-white shadow-sm'
                : 'text-surface-600 border-surface-200 hover:border-surface-300 hover:bg-surface-50 border bg-white',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="relative h-64 w-full md:h-72"
        aria-label={`Évolution des prix alimentaires vs 2015 (%) — ${PERIODS.find((p) => p.value === period)?.label ?? period}`}
      >
        {isLoadingExtended && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-sm">
            <svg
              className="text-republic-500 h-6 w-6 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={xFormatter}
              tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={period === '10ans' || period === 'max' ? 60 : 40}
            />
            <YAxis
              dataKey="pct"
              tickFormatter={(v: number) => formatPct(v)}
              tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.7} />
            <Line
              type="monotone"
              dataKey="pct"
              name="Vs 2015"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: LINE_COLOR, stroke: '#ffffff', strokeWidth: 2 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-surface-600 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-4 rounded-sm"
            style={{ backgroundColor: LINE_COLOR }}
          />
          <span>Évolution vs 2015 (%) — 100 = 0%</span>
        </div>
      </div>
    </div>
  )
}
