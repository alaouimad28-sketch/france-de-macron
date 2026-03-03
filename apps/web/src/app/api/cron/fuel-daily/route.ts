/**
 * Vercel Cron Handler — Job quotidien carburants
 *
 * Déclenché par Vercel Cron à 02:30 UTC (voir vercel.json).
 * Sécurisé par CRON_SECRET (vérifier l'Authorization header).
 *
 * Exécute le même flux que le script fuel-daily : download → parse → upsert → FCI.
 * Documentation pipeline : docs/data/pipeline.md
 */
import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/database.types'
import {
  calcAndUpsertFCI,
  DayDataUnavailableError,
  downloadDayXml,
  parseDayXmlToAggregates,
  upsertFuelAggregates,
} from '../../../../../../../scripts/shared'

export const runtime = 'nodejs'
export const maxDuration = 60 // secondes (limite Vercel Hobby/Pro)

function getYesterdayUTC(): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startMs = Date.now()
  const targetDate = getYesterdayUTC()
  const targetDateStr = targetDate.toISOString().slice(0, 10)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase config', timestamp: new Date().toISOString() },
      { status: 500 },
    )
  }

  try {
    const supabase = createClient<Database>(url, serviceKey)

    const xml = await downloadDayXml(targetDate)
    const rows = await parseDayXmlToAggregates(xml, targetDate)
    const fuelAggregatesUpserted = await upsertFuelAggregates(supabase, rows)

    const fciScore = await calcAndUpsertFCI(supabase, targetDate)

    const durationMs = Date.now() - startMs

    return NextResponse.json({
      ok: true,
      date: targetDateStr,
      fuelAggregatesUpserted,
      fci: fciScore ?? null,
      durationMs,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    if (err instanceof DayDataUnavailableError) {
      const durationMs = Date.now() - startMs
      return NextResponse.json(
        {
          ok: true,
          date: targetDateStr,
          message: 'Données indisponibles pour cette date',
          fuelAggregatesUpserted: 0,
          fci: null,
          durationMs,
          timestamp: new Date().toISOString(),
        },
        { status: 200 },
      )
    }
    console.error('[cron/fuel-daily] Erreur :', err)
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        date: targetDateStr,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
