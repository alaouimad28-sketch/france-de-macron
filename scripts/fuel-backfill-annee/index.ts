/**
 * Job : fuel-backfill-annee
 *
 * Backfill des agrégats carburant depuis les archives annuelles (2007 → année courante).
 * Télécharge un ZIP par année, parse le XML en streaming, agrège par (jour, carburant), upsert dans fuel_daily_agg.
 *
 * Usage :
 *   pnpm run fuel:backfill:annees
 *   START_YEAR=2015 END_YEAR=2020 pnpm run fuel:backfill:annees
 *
 * Prérequis : SUPABASE_SERVICE_ROLE_KEY et NEXT_PUBLIC_SUPABASE_URL (ex. via apps/web/.env.local).
 * Voir docs/data/sources.md pour les volumes (ZIP ~15–30 Mo/an, agrégats en base ~10–30 Mo total).
 */
/// <reference types="node" />
/// <reference path="./adm-zip.d.ts" />
/// <reference path="./dotenv.d.ts" />

import AdmZip from 'adm-zip'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as sax from 'sax'
import { config } from 'dotenv'

// Charger .env depuis apps/web (quand on lance depuis la racine ou depuis scripts/)
const envPaths = [
  path.join(process.cwd(), 'apps', 'web', '.env.local'),
  path.join(process.cwd(), '.env.local'),
  path.resolve(__dirname, '..', '..', 'apps', 'web', '.env.local'),
]
for (const p of envPaths) {
  config({ path: p })
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) break
}

const FUEL_CODES = new Set(['gazole', 'e10', 'sp98', 'e85', 'gplc', 'sp95'])
const MIN_PRICE = 0.5
const MAX_PRICE = 5.0
const FETCH_TIMEOUT_MS = 120_000 // 2 min par année (ZIP lourd)
const RETRY_DELAYS_MS = [2000, 10000, 60000] as const

interface DayAggregate {
  day: string
  fuelCode: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  sampleCount: number
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

async function downloadYearZip(year: number): Promise<Buffer> {
  const baseUrl = process.env['FUEL_API_BASE_URL'] ?? 'https://donnees.roulez-eco.fr/opendata'
  const url = `${baseUrl}/annee/${year}`

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/zip, application/octet-stream' },
      })
      clearTimeout(timeoutId)

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
        return buffer
      }
      throw new Error(`Réponse non-ZIP pour ${url}`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]))
      }
    }
  }
  throw lastError ?? new Error(`downloadYearZip(${year}) failed`)
}

/**
 * Parse le XML annuel en streaming : groupe (jour, carburant) → liste de prix.
 * Gère ruptures (exclut le carburant en rupture pour la station) et filtre prix aberrants.
 */
function parseAnnualXmlToDayPrices(xmlString: string): Promise<Map<string, Map<string, number[]>>> {
  const dayPrices = new Map<string, Map<string, number[]>>()
  let currentRuptures = new Set<string>()

  const parser = sax.createStream(true, { trim: true })
  parser.on('opentag', (tag: { name: string; attributes: Record<string, unknown> }) => {
    const name = tag.name.toLowerCase()
    const attrs = tag.attributes
    if (name === 'pdv') {
      currentRuptures = new Set<string>()
      return
    }
    if (name === 'rupture') {
      const nom = (attrs['nom'] ?? attrs['Nom'] ?? '').toString().toLowerCase()
      const fin = attrs['fin'] ?? attrs['Fin'] ?? ''
      if (nom && !String(fin).trim()) currentRuptures.add(nom)
      return
    }
    if (name === 'prix') {
      const nom = (attrs['nom'] ?? attrs['Nom'] ?? '').toString().toLowerCase()
      const maj = (attrs['maj'] ?? attrs['Maj'] ?? '').toString()
      const rawVal = attrs['valeur'] ?? attrs['Valeur']
      if (!nom || !maj || rawVal === undefined) return
      if (currentRuptures.has(nom)) return
      if (!FUEL_CODES.has(nom)) return
      const value = Number(rawVal)
      if (Number.isNaN(value)) return
      const pricePerL = value > 100 ? value / 1000 : value
      if (pricePerL < MIN_PRICE || pricePerL > MAX_PRICE) return
      const day = maj.slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return
      let byFuel = dayPrices.get(day)
      if (!byFuel) {
        byFuel = new Map<string, number[]>()
        dayPrices.set(day, byFuel)
      }
      let arr = byFuel.get(nom)
      if (!arr) {
        arr = []
        byFuel.set(nom, arr)
      }
      arr.push(pricePerL)
    }
  })

  return new Promise<Map<string, Map<string, number[]>>>((resolve, reject) => {
    parser.on('end', () => resolve(dayPrices))
    parser.on('error', reject)
    // Envoyer le XML par chunks pour limiter la mémoire par écriture
    const chunkSize = 1024 * 1024 // 1 Mo
    for (let i = 0; i < xmlString.length; i += chunkSize) {
      parser.write(xmlString.slice(i, i + chunkSize))
    }
    parser.end()
  })
}

function aggregateToRows(dayPrices: Map<string, Map<string, number[]>>): DayAggregate[] {
  const rows: DayAggregate[] = []
  for (const [day, byFuel] of dayPrices) {
    for (const [fuelCode, prices] of byFuel) {
      if (prices.length === 0) continue
      const sum = prices.reduce((a, b) => a + b, 0)
      rows.push({
        day,
        fuelCode,
        avgPrice: round3(sum / prices.length),
        minPrice: round3(Math.min(...prices)),
        maxPrice: round3(Math.max(...prices)),
        sampleCount: prices.length,
      })
    }
  }
  return rows
}

async function upsertAggregates(supabase: SupabaseClient, rows: DayAggregate[]): Promise<number> {
  if (rows.length === 0) return 0
  const batchSize = 500
  let upserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map((r) => ({
      day: r.day,
      fuel_code: r.fuelCode,
      avg_price_eur_per_l: r.avgPrice,
      min_price_eur_per_l: r.minPrice,
      max_price_eur_per_l: r.maxPrice,
      sample_count: r.sampleCount,
    }))
    const { error } = await supabase.from('fuel_daily_agg').upsert(batch, {
      onConflict: 'day,fuel_code',
    })
    if (error) throw new Error(`Supabase upsert: ${error.message}`)
    upserted += batch.length
  }
  return upserted
}

async function processYear(
  year: number,
  supabase: SupabaseClient,
): Promise<{ rows: number; upserted: number }> {
  console.log(`[${year}] Téléchargement ZIP...`)
  const zipBuffer = await downloadYearZip(year)
  const zip = new AdmZip(zipBuffer)
  const entries = zip.getEntries()
  const xmlEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('.xml')) ?? entries[0]
  if (!xmlEntry?.getData()) throw new Error(`ZIP ${year} sans fichier XML`)
  const xmlBuffer = xmlEntry.getData() as Buffer
  const xmlString = xmlBuffer.toString('latin1')

  console.log(`[${year}] Parsing XML (streaming)...`)
  const dayPrices = await parseAnnualXmlToDayPrices(xmlString)
  const rows = aggregateToRows(dayPrices)
  console.log(`[${year}] ${rows.length} agrégats (${dayPrices.size} jours)`)

  const upserted = await upsertAggregates(supabase, rows)
  return { rows: rows.length, upserted }
}

async function main(): Promise<void> {
  const startYear = parseInt(process.env['START_YEAR'] ?? '2007', 10)
  const endYear = parseInt(process.env['END_YEAR'] ?? String(new Date().getFullYear()), 10)
  if (startYear < 2007 || endYear < startYear) {
    console.error('START_YEAR doit être >= 2007 et END_YEAR >= START_YEAR.')
    process.exit(1)
  }

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) {
    console.error(
      'Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (ex. apps/web/.env.local).',
    )
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const startMs = Date.now()
  let totalRows = 0
  let totalUpserted = 0

  for (let year = startYear; year <= endYear; year++) {
    try {
      const { rows, upserted } = await processYear(year, supabase)
      totalRows += rows
      totalUpserted += upserted
    } catch (err) {
      console.error(`[${year}] Erreur:`, err)
      throw err
    }
  }

  const durationMs = Date.now() - startMs
  console.log('\n--- Résumé ---')
  console.log(`Années : ${startYear} → ${endYear}`)
  console.log(`Agrégats calculés : ${totalRows}`)
  console.log(`Upsertés en base : ${totalUpserted}`)
  console.log(`Durée : ${(durationMs / 1000).toFixed(1)} s`)
}

main().catch((err: unknown) => {
  console.error('[fuel-backfill-annee] Erreur fatale :', err)
  process.exit(1)
})
