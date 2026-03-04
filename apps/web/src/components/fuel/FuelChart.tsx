'use client'

/**
 * FuelChart — Graphique Recharts multi-carburant
 *
 * - Périodes courtes (7j/30j/90j) : filtre sur les données initiales
 * - Périodes longues (1an/5ans/max) : fetch GET /api/fuel?period=... côté client
 * - Tooltip custom, spikes Δ>3%, annotations événements
 */

import { useCallback, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { formatFuelPrice } from '@/lib/utils'
import type { ChartEvent, FuelChartDataPoint, FuelPeriodFilter } from '@/types'
import { PeriodChipGroup } from './PeriodChip'

const FUEL_CONFIG: Record<string, { label: string; color: string }> = {
  gazole: { label: 'Gazole', color: '#2563EB' },
  e10: { label: 'E10', color: '#16A34A' },
  sp98: { label: 'SP98', color: '#D97706' },
}

function formatXAxisDate(dateStr: string, period: FuelPeriodFilter): string {
  const d = new Date(dateStr)
  if (period === '5ans' || period === 'max') {
    return new Intl.DateTimeFormat('fr-FR', { year: 'numeric' }).format(d)
  }
  if (period === '1an') {
    return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(d)
  }
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(d)
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const date = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(label as string))

  return (
    <div className="border-surface-200 min-w-[160px] rounded-lg border bg-white p-3 text-sm shadow-lg">
      <p className="text-surface-600 mb-2 font-mono text-xs">{date}</p>
      {payload.map((entry) => {
        const cfg = FUEL_CONFIG[entry.dataKey as string]
        if (!cfg || entry.value === undefined || entry.value === null) return null
        return (
          <div
            key={entry.dataKey as string}
            className="flex items-center justify-between gap-3 py-0.5"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-surface-600">{cfg.label}</span>
            </div>
            <span className="font-mono font-semibold" style={{ color: cfg.color }}>
              {typeof entry.value === 'number' ? formatFuelPrice(entry.value) : String(entry.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

interface SpikePoint {
  date: string
  fuelCode: string
  value: number
}

function computeSpikes(data: FuelChartDataPoint[], fuelCodes: string[]): SpikePoint[] {
  const spikes: SpikePoint[] = []
  for (let i = 1; i < data.length; i++) {
    const curr = data[i]
    const prev = data[i - 1]
    if (!curr || !prev) continue
    for (const fuelCode of fuelCodes) {
      const c = curr[fuelCode]
      const p = prev[fuelCode]
      if (typeof c === 'number' && typeof p === 'number' && p > 0) {
        if (Math.abs((c - p) / p) > 0.03) {
          spikes.push({ date: curr.date, fuelCode, value: c })
        }
      }
    }
  }
  return spikes
}

export interface FuelChartProps {
  data: FuelChartDataPoint[]
  events?: ChartEvent[]
}

const SHORT_PERIODS: FuelPeriodFilter[] = ['7j', '30j', '90j']

export function FuelChart({ data: initialData, events = [] }: FuelChartProps) {
  const [period, setPeriod] = useState<FuelPeriodFilter>('30j')
  const [extendedData, setExtendedData] = useState<FuelChartDataPoint[] | null>(null)
  const [isLoadingExtended, setIsLoadingExtended] = useState(false)

  const handlePeriodChange = useCallback(async (newPeriod: FuelPeriodFilter) => {
    setPeriod(newPeriod)

    if (SHORT_PERIODS.includes(newPeriod)) {
      setExtendedData(null)
      return
    }

    // Périodes longues : fetch depuis /api/fuel
    setIsLoadingExtended(true)
    try {
      const res = await fetch(`/api/fuel?period=${newPeriod}`)
      if (!res.ok) throw new Error('Failed')
      const newData = (await res.json()) as FuelChartDataPoint[]
      setExtendedData(newData)
    } catch {
      // Fallback silencieux sur les données initiales
      setExtendedData(null)
    } finally {
      setIsLoadingExtended(false)
    }
  }, [])

  const activeData = extendedData ?? initialData

  const filteredData = useMemo(() => {
    if (period === '7j') return activeData.slice(-7)
    if (period === '30j') return activeData.slice(-30)
    return activeData
  }, [activeData, period])

  const availableFuels = useMemo(() => {
    if (filteredData.length === 0) return []
    const hasValue = (key: string) =>
      filteredData.some((row) => {
        const v = row[key]
        return v !== undefined && v !== null && typeof v === 'number'
      })
    return Object.keys(FUEL_CONFIG).filter(hasValue)
  }, [filteredData])

  const spikes = useMemo(
    () =>
      period === '7j' || period === '30j' || period === '90j'
        ? computeSpikes(filteredData, availableFuels)
        : [],
    [filteredData, availableFuels, period],
  )

  const visibleEvents = useMemo(() => {
    if (filteredData.length === 0) return []
    const firstDate = filteredData[0]!.date
    const lastDate = filteredData[filteredData.length - 1]!.date
    return events.filter((e) => e.day >= firstDate && e.day <= lastDate)
  }, [events, filteredData])

  if (filteredData.length === 0 && !isLoadingExtended) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-surface-600 text-sm">Aucune donnée disponible.</p>
      </div>
    )
  }

  const xFormatter = (dateStr: string) => formatXAxisDate(dateStr, period)

  return (
    <div className="space-y-4">
      {/* Sélecteur de période */}
      <PeriodChipGroup activePeriod={period} onChange={(p) => void handlePeriodChange(p)} />

      {/* Graphique */}
      <div className="relative h-64 w-full md:h-80" aria-label="Graphique des prix carburants">
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
          <LineChart data={filteredData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

            <XAxis
              dataKey="date"
              tickFormatter={xFormatter}
              tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={period === '5ans' || period === 'max' ? 60 : 40}
            />

            <YAxis
              tickFormatter={(v: number) => v.toFixed(3)}
              tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              width={52}
            />

            <Tooltip content={<CustomTooltip />} />

            {availableFuels.map((fuelCode) => {
              const cfg = FUEL_CONFIG[fuelCode]!
              return (
                <Line
                  key={fuelCode}
                  type="monotone"
                  dataKey={fuelCode}
                  name={cfg.label}
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: cfg.color, stroke: '#ffffff', strokeWidth: 2 }}
                  connectNulls={false}
                />
              )
            })}

            {/* Spikes (courtes périodes seulement) */}
            {spikes.map((spike) => (
              <ReferenceDot
                key={`spike-${spike.fuelCode}-${spike.date}`}
                x={spike.date}
                y={spike.value}
                r={5}
                fill="#f43f5e"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            ))}

            {/* Annotations événements */}
            {visibleEvents.map((event) => (
              <ReferenceLine
                key={event.id}
                x={event.day}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: event.label_fr,
                  position: 'insideTopLeft',
                  fill: '#f43f5e',
                  fontSize: 10,
                  fontFamily: 'var(--font-body)',
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Légende */}
      <div className="text-surface-600 flex flex-wrap gap-4 text-xs">
        {availableFuels.map((fuelCode) => {
          const cfg = FUEL_CONFIG[fuelCode]!
          return (
            <div key={fuelCode} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-4 rounded-sm"
                style={{ backgroundColor: cfg.color }}
              />
              <span>{cfg.label}</span>
            </div>
          )
        })}
        {spikes.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="bg-alert-500 inline-block h-2 w-2 rounded-full" />
            <span>Spike &gt; 3%</span>
          </div>
        )}
      </div>
    </div>
  )
}
