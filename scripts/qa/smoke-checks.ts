import { assert, startWebServer } from './common'

async function expectPage(baseUrl: string, path: string, marker: string) {
  const response = await fetch(`${baseUrl}${path}`)
  const html = await response.text()

  assert(response.status === 200, `[smoke] ${path} expected 200, got ${response.status}`)
  assert(html.includes(marker), `[smoke] ${path} missing marker: ${marker}`)
}

async function run() {
  const server = await startWebServer()

  try {
    await expectPage(server.baseUrl, '/', 'France de Macron')
    await expectPage(server.baseUrl, '/about', 'À propos')
    await expectPage(server.baseUrl, '/methodology', 'Méthodologie')

    const votesResponse = await fetch(`${server.baseUrl}/api/votes?scope=global`)
    assert(
      votesResponse.status === 200,
      `[smoke] /api/votes expected 200, got ${votesResponse.status}`,
    )

    const votesJson = (await votesResponse.json()) as Record<string, unknown>
    for (const key of ['scope', 'cooked', 'uncooked', 'total', 'ratio_cooked']) {
      assert(key in votesJson, `[smoke] /api/votes missing key: ${key}`)
    }

    const newsletterInvalidRes = await fetch(`${server.baseUrl}/api/newsletter`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', honeypot: '' }),
    })
    assert(
      newsletterInvalidRes.status === 400,
      `[smoke] /api/newsletter invalid payload should return 400, got ${newsletterInvalidRes.status}`,
    )

    const newsletterHoneypotRes = await fetch(`${server.baseUrl}/api/newsletter`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'bot@example.com', honeypot: 'i-am-a-bot' }),
    })
    assert(
      newsletterHoneypotRes.status === 200,
      `[smoke] /api/newsletter honeypot should return 200, got ${newsletterHoneypotRes.status}`,
    )

    const honeypotJson = (await newsletterHoneypotRes.json()) as Record<string, unknown>
    assert(
      honeypotJson.success === true,
      '[smoke] /api/newsletter honeypot response must be success=true',
    )

    console.log('✅ Phase 7 smoke checks passed')
  } finally {
    await server.stop()
  }
}

run().catch((error: unknown) => {
  console.error('❌ Phase 7 smoke checks failed')
  console.error(error)
  process.exit(1)
})
