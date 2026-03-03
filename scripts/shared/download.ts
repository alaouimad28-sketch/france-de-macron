/// <reference types="node" />
import AdmZip from 'adm-zip'
import { FETCH_TIMEOUT_MS, RETRY_DELAYS_MS } from './constants'

/** Thrown when the API returns 404 or HTML (no data for this day). Caller should skip. */
export class DayDataUnavailableError extends Error {
  constructor(
    public readonly date: Date,
    public readonly url: string,
  ) {
    super(`Données indisponibles pour le ${date.toISOString().slice(0, 10)}: ${url}`)
    this.name = 'DayDataUnavailableError'
  }
}

/**
 * Télécharge et décompresse le ZIP d'un jour depuis l'API officielle.
 * Retry × 3 avec backoff. 404 ou réponse HTML → DayDataUnavailableError.
 */
export async function downloadDayXml(date: Date): Promise<string> {
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '')
  const baseUrl = process.env['FUEL_API_BASE_URL'] ?? 'https://donnees.roulez-eco.fr/opendata'
  const url = `${baseUrl}/jour/${yyyymmdd}`

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

      if (response.status === 404) throw new DayDataUnavailableError(date, url)
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const contentType = response.headers.get('content-type') ?? ''
      const isZip =
        contentType.includes('application/zip') ||
        contentType.includes('octet-stream') ||
        (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b)
      if (!isZip) throw new DayDataUnavailableError(date, url)

      const zip = new AdmZip(buffer)
      const entries = zip.getEntries()
      const xmlEntry =
        entries.find((e: { entryName: string }) => e.entryName.toLowerCase().endsWith('.xml')) ??
        entries[0]
      if (!xmlEntry?.getData()) throw new Error(`ZIP sans fichier XML: ${url}`)
      const xmlBuffer = xmlEntry.getData() as Buffer
      return xmlBuffer.toString('latin1')
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (err instanceof DayDataUnavailableError) throw err
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]))
      }
    }
  }
  throw lastError ?? new Error(`downloadDayXml failed: ${url}`)
}
