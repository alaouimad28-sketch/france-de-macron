/**
 * Vercel Cron Handler — Job quotidien carburants
 *
 * Déclenché par Vercel Cron à 02:30 UTC (voir vercel.json).
 * Sécurisé par CRON_SECRET (vérifier l'Authorization header).
 *
 * TODO (implémentation) :
 *   1. Valider le header Authorization Bearer ${CRON_SECRET}
 *   2. Appeler le service d'ingestion fuel-daily
 *   3. Calculer le FCI du jour
 *   4. Logger le résultat
 *
 * Documentation pipeline : docs/data/pipeline.md
 */
import { type NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60 // secondes (limite Vercel Hobby/Pro)

export async function GET(request: NextRequest) {
  // Vérification du secret Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // TODO: implémenter l'ingestion
    // await runFuelDailyJob()
    // await recalcFCI()

    return NextResponse.json({
      ok: true,
      message: 'Job fuel-daily placeholder — implémentation à venir',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[cron/fuel-daily] Erreur :', error)
    return NextResponse.json(
      { error: 'Internal Server Error', timestamp: new Date().toISOString() },
      { status: 500 },
    )
  }
}
