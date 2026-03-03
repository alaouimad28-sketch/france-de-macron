/// <reference path="./sax.d.ts" />
import * as sax from 'sax'
import type { FuelDayAggregate } from './types'
import { FUEL_CODES, MAX_PRICE, MIN_PRICE, round3 } from './constants'

/**
 * Parse le XML quotidien (un jour) et retourne les agrégats par carburant.
 * Ruptures sans fin exclues, valeur ÷ 1000 → €/L, filtre [0.5, 5.0] €/L.
 */
export async function parseDayXmlToAggregates(xml: string, day: Date): Promise<FuelDayAggregate[]> {
  const byFuel = new Map<string, number[]>()
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
      const rawVal = attrs['valeur'] ?? attrs['Valeur']
      if (!nom || rawVal === undefined) return
      if (currentRuptures.has(nom)) return
      if (!FUEL_CODES.has(nom)) return
      const value = Number(rawVal)
      if (Number.isNaN(value)) return
      const pricePerL = value > 100 ? value / 1000 : value
      if (pricePerL < MIN_PRICE || pricePerL > MAX_PRICE) return
      let arr = byFuel.get(nom)
      if (!arr) {
        arr = []
        byFuel.set(nom, arr)
      }
      arr.push(pricePerL)
    }
  })

  await new Promise<void>((resolve, reject) => {
    parser.on('end', () => resolve())
    parser.on('error', reject)
    const chunkSize = 512 * 1024
    for (let i = 0; i < xml.length; i += chunkSize) {
      parser.write(xml.slice(i, i + chunkSize))
    }
    parser.end()
  })

  const dayStr = day.toISOString().slice(0, 10)
  const results: FuelDayAggregate[] = []
  for (const [fuelCode, prices] of byFuel) {
    if (prices.length === 0) continue
    const sum = prices.reduce((a, b) => a + b, 0)
    results.push({
      day: dayStr,
      fuelCode,
      avgPrice: round3(sum / prices.length),
      minPrice: round3(Math.min(...prices)),
      maxPrice: round3(Math.max(...prices)),
      sampleCount: prices.length,
    })
  }
  return results
}
