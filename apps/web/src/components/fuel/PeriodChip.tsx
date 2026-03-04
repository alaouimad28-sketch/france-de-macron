'use client'

/**
 * PeriodChip — Chip de filtre temporel pour le graphique carburants
 *
 * Toutes les périodes sont disponibles : 7j | 30j | 90j | 1 an | 5 ans | Max
 * Les périodes longues (1an+) déclenchent un fetch côté client dans FuelChart.
 */

import type { FuelPeriodFilter } from '@/types'

const PERIODS: { value: FuelPeriodFilter; label: string }[] = [
  { value: '7j', label: '7j' },
  { value: '30j', label: '30j' },
  { value: '90j', label: '90j' },
  { value: '1an', label: '1 an' },
  { value: '5ans', label: '5 ans' },
  { value: 'max', label: 'Max' },
]

interface PeriodChipProps {
  activePeriod: FuelPeriodFilter
  onChange: (period: FuelPeriodFilter) => void
}

export function PeriodChipGroup({ activePeriod, onChange }: PeriodChipProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Période du graphique">
      {PERIODS.map(({ value, label }) => (
        <PeriodChip
          key={value}
          value={value}
          label={label}
          isActive={activePeriod === value}
          onSelect={onChange}
        />
      ))}
    </div>
  )
}

interface SingleChipProps {
  value: FuelPeriodFilter
  label: string
  isActive: boolean
  onSelect: (period: FuelPeriodFilter) => void
}

function PeriodChip({ value, label, isActive, onSelect }: SingleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={`Période ${label}`}
      onClick={() => onSelect(value)}
      onMouseDown={(e) => {
        const el = e.currentTarget
        el.style.transform = 'scale(0.95)'
        const reset = () => {
          el.style.transform = ''
          el.removeEventListener('mouseup', reset)
          el.removeEventListener('mouseleave', reset)
        }
        el.addEventListener('mouseup', reset)
        el.addEventListener('mouseleave', reset)
      }}
      className={[
        'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150',
        'focus-visible:ring-republic-500 focus-visible:outline-none focus-visible:ring-2',
        isActive
          ? 'bg-republic-500 text-white shadow-sm'
          : 'text-surface-600 border-surface-200 hover:border-surface-300 hover:bg-surface-50 border bg-white',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
