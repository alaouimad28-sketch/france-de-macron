/// <reference types="node" />

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../apps/web/src/lib/supabase/database.types'
import { calcFCIv1 } from '../shared/fci'
import { assert } from './common'

function series(valueToday: number, value30dAgo: number): number[] {
  return Array.from({ length: 30 }, (_, index) => {
    const ratio = index / 29
    return valueToday + (value30dAgo - valueToday) * ratio
  })
}

function runSyntheticBenchmarks(): void {
  const covidScore = calcFCIv1(series(1.22, 1.28), series(1.3, 1.34))
  const spikeScore = calcFCIv1(series(2.12, 1.7), series(2.2, 1.78))

  assert(covidScore <= 30, `Expected COVID-like low scenario <= 30, got ${covidScore}`)
  assert(spikeScore >= 80, `Expected 2022-like spike scenario >= 80, got ${spikeScore}`)

  console.log('[qa:fci-intuition] Synthetic benchmarks OK')
  console.log(`[qa:fci-intuition]   - COVID-like low scenario: ${covidScore}`)
  console.log(`[qa:fci-intuition]   - 2022-like spike scenario: ${spikeScore}`)
}

async function readRangeExtrema(
  supabase: ReturnType<typeof createClient<Database>>,
  start: string,
  end: string,
): Promise<{ min: number; max: number; samples: number }> {
  const { data, error } = await supabase
    .from('fci_daily')
    .select('score')
    .gte('day', start)
    .lte('day', end)

  if (error) {
    throw new Error(`Failed to query fci_daily ${start}..${end}: ${error.message}`)
  }

  const scores = (data ?? [])
    .map((row) => row.score)
    .filter((score): score is number => score !== null)
  assert(scores.length > 0, `No FCI samples found for ${start}..${end}`)

  return {
    min: Math.min(...scores),
    max: Math.max(...scores),
    samples: scores.length,
  }
}

async function runLiveValidationIfConfigured(): Promise<void> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    console.log(
      '[qa:fci-intuition] Live validation skipped (missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)',
    )
    return
  }

  const supabase = createClient<Database>(url, key)

  const covidWindow = await readRangeExtrema(supabase, '2020-03-01', '2020-06-30')
  const spikeWindow = await readRangeExtrema(supabase, '2022-03-01', '2022-10-31')

  assert(
    covidWindow.min <= 35,
    `Expected 2020 COVID window min <= 35, got ${covidWindow.min} (${covidWindow.samples} samples)`,
  )
  assert(
    spikeWindow.max >= 80,
    `Expected 2022 spike window max >= 80, got ${spikeWindow.max} (${spikeWindow.samples} samples)`,
  )

  console.log('[qa:fci-intuition] Live historical validation OK')
  console.log(
    `[qa:fci-intuition]   - COVID window 2020-03..06: min=${covidWindow.min}, max=${covidWindow.max}, n=${covidWindow.samples}`,
  )
  console.log(
    `[qa:fci-intuition]   - Spike window 2022-03..10: min=${spikeWindow.min}, max=${spikeWindow.max}, n=${spikeWindow.samples}`,
  )
}

async function main(): Promise<void> {
  runSyntheticBenchmarks()
  await runLiveValidationIfConfigured()
  console.log('[qa:fci-intuition] PASS')
}

main().catch((error: unknown) => {
  console.error('[qa:fci-intuition] FAIL', error)
  process.exit(1)
})
