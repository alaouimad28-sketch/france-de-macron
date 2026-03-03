'use client'

/**
 * FCIGauge — Jauge semicirculaire SVG (Client Component)
 *
 * Arc HTML-hybrid :
 *   - SVG pour l'arc et l'aiguille uniquement
 *   - HTML pour le score, "/100" et la variation (pas de chevauchement)
 */

import { useEffect, useState } from 'react'
import { getFCIScoreColor } from '@/lib/utils'

const CX = 100
const CY = 100
const R = 78
const HALF_CIRC = Math.PI * R

const GAUGE_BLUE = '#2355EE'
const GAUGE_RED = '#F43F5E'

function arcPoint(score: number, radius: number): [number, number] {
  const angle = Math.PI * (1 - score / 100)
  return [CX + radius * Math.cos(angle), CY - radius * Math.sin(angle)]
}

const MAJOR_TICKS = [0, 25, 50, 75, 100]

interface FCIGaugeProps {
  score: number
  previousScore?: number
  updatedAt: string
  isLoading?: boolean
}

export function FCIGauge({ score, previousScore, isLoading }: FCIGaugeProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-xs space-y-3">
        <div className="skeleton mx-auto h-32 w-full rounded-2xl" />
        <div className="skeleton mx-auto h-10 w-24 rounded-lg" />
      </div>
    )
  }

  const progress = animated ? (score / 100) * HALF_CIRC : 0
  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`
  const scoreColor = getFCIScoreColor(score)
  const variation = previousScore !== undefined ? score - previousScore : null

  const [nx, ny] = arcPoint(score, 62)

  const variationColor =
    variation === null
      ? '#6b7280'
      : variation > 0
        ? GAUGE_RED
        : variation < 0
          ? GAUGE_BLUE
          : '#6b7280'

  return (
    <div
      role="img"
      aria-label={`French Cooked Index : ${score} sur 100`}
      className="mx-auto w-full max-w-[300px]"
    >
      {/* ── Arc SVG ─────────────────────────────── */}
      <svg viewBox="0 0 200 108" className="flex w-full flex-wrap overflow-visible bg-white">
        <defs>
          <linearGradient id="gaugeGrad" gradientUnits="userSpaceOnUse" x1={CX - R} y1="0" x2={CX + R} y2="0">
            <stop offset="0%" stopColor={GAUGE_BLUE} />
            <stop offset="100%" stopColor={GAUGE_RED} />
          </linearGradient>
          {score >= 75 && (
            <filter id="gaugeGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Track de fond */}
        <path d={arcPath} fill="none" stroke="#e5e7eb" strokeWidth={12} strokeLinecap="round" />

        {/* Arc de progression */}
        <path
          d={arcPath}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${HALF_CIRC}`}
          filter={score >= 75 ? 'url(#gaugeGlow)' : undefined}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />

        {/* Ticks majeurs */}
        {MAJOR_TICKS.map((s) => {
          const [ox, oy] = arcPoint(s, R + 7)
          const [ix, iy] = arcPoint(s, R - 6)
          return (
            <line key={s} x1={ox} y1={oy} x2={ix} y2={iy} stroke="#9ca3af" strokeWidth={1.5} />
          )
        })}

        {/* Aiguille */}
        <line
          x1={CX} y1={CY}
          x2={nx} y2={ny}
          stroke={scoreColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={5} fill={scoreColor} />
        <circle cx={CX} cy={CY} r={2.5} fill="white" />

        {/* Labels 0 / 100 */}
        <text
          x={CX - R - 4} y={CY + 14}
          textAnchor="end" fontSize="9"
          fill={GAUGE_BLUE} fontFamily="var(--font-mono)" fontWeight="700"
        >0</text>
        <text
          x={CX + R + 4} y={CY + 14}
          textAnchor="start" fontSize="9"
          fill={GAUGE_RED} fontFamily="var(--font-mono)" fontWeight="700"
        >100</text>
      </svg>

      {/* ── Score + variation (HTML) ─────────────── */}
      <div className="mt-1 flex flex-col items-center gap-0.5">
        {/* Chiffre */}
        <div className="leading-none">
          <span
            className="font-display text-6xl font-black"
            style={{ color: scoreColor }}
          >
            {score}
          </span>
          <span className="ml-1.5 font-mono text-sm font-medium text-surface-500">
            / 100
          </span>
        </div>

        {/* Variation */}
        {variation !== null && (
          <p
            className="font-mono text-sm font-semibold"
            style={{ color: variationColor }}
          >
            {variation > 0 ? '▲' : variation < 0 ? '▼' : '→'}{' '}
            {variation > 0 ? '+' : ''}
            {variation.toFixed(1)} pts depuis hier
          </p>
        )}
      </div>
    </div>
  )
}
