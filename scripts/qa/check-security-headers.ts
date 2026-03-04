import { assert, startWebServer } from './common'

const REQUIRED_HEADERS = [
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'content-security-policy',
] as const

async function run() {
  const server = await startWebServer(4011)

  try {
    const response = await fetch(`${server.baseUrl}/`)

    assert(response.status === 200, `[headers] expected / to return 200, got ${response.status}`)

    for (const header of REQUIRED_HEADERS) {
      assert(response.headers.has(header), `[headers] missing required header: ${header}`)
    }

    const csp = response.headers.get('content-security-policy') ?? ''
    assert(csp.includes("default-src 'self'"), "[headers] CSP must include default-src 'self'")
    assert(
      csp.includes("frame-ancestors 'none'"),
      "[headers] CSP must include frame-ancestors 'none'",
    )

    console.log('✅ Security headers checks passed')
  } finally {
    await server.stop()
  }
}

run().catch((error: unknown) => {
  console.error('❌ Security headers checks failed')
  console.error(error)
  process.exit(1)
})
