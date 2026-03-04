import { assert, startWebServer } from './common'

const PAGE_PATHS = ['/', '/about', '/methodology', '/disclaimer'] as const

function extractMetaDescription(html: string): string | null {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
  return match?.[1] ?? null
}

async function run() {
  const server = await startWebServer(4012)

  try {
    for (const path of PAGE_PATHS) {
      const response = await fetch(`${server.baseUrl}${path}`)
      const html = await response.text()

      assert(response.status === 200, `[meta] ${path} expected 200, got ${response.status}`)

      const description = extractMetaDescription(html)
      assert(description, `[meta] ${path} missing meta description`)
      assert(
        description.length <= 155,
        `[meta] ${path} description too long (${description.length} chars > 155): ${description}`,
      )
    }

    console.log('✅ Meta description length checks passed')
  } finally {
    await server.stop()
  }
}

run().catch((error: unknown) => {
  console.error('❌ Meta description checks failed')
  console.error(error)
  process.exit(1)
})
