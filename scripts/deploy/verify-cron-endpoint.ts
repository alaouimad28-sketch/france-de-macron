#!/usr/bin/env tsx

const DEFAULT_CRON_PATH = '/api/cron/fuel-daily'

type VerifyResult = {
  ok: boolean
  message: string
}

function ensureTrailingSlashless(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

async function checkUnauthorized(cronUrl: string): Promise<VerifyResult> {
  const response = await fetch(cronUrl)
  if (response.status !== 401) {
    return {
      ok: false,
      message: `Unauthorized check failed: expected 401, got ${response.status}`,
    }
  }

  return { ok: true, message: 'Unauthorized check passed (401 without token)' }
}

async function checkAuthorized(cronUrl: string, cronSecret: string): Promise<VerifyResult> {
  const response = await fetch(cronUrl, {
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  })

  if (response.status !== 200) {
    return {
      ok: false,
      message: `Authorized check failed: expected 200, got ${response.status}`,
    }
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    return { ok: false, message: 'Authorized check failed: response is not valid JSON' }
  }

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

  const hasOk = isRecord(json) && Object.hasOwn(json, 'ok')
  const hasDate = isRecord(json) && Object.hasOwn(json, 'date')

  if (!hasOk || !hasDate) {
    return {
      ok: false,
      message: 'Authorized check failed: JSON must include `ok` and `date` fields',
    }
  }

  return { ok: true, message: 'Authorized check passed (200 with expected payload shape)' }
}

async function main() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const cronSecret = process.env.CRON_SECRET
  const cronPath = process.env.CRON_PATH ?? DEFAULT_CRON_PATH

  if (!appUrl) {
    console.error('Missing NEXT_PUBLIC_APP_URL')
    process.exit(1)
  }

  if (!cronSecret) {
    console.error('Missing CRON_SECRET')
    process.exit(1)
  }

  const cronUrl = `${ensureTrailingSlashless(appUrl)}${cronPath}`
  console.log(`Verifying cron endpoint: ${cronUrl}`)

  const unauthorized = await checkUnauthorized(cronUrl)
  console.log(`${unauthorized.ok ? '✅' : '❌'} ${unauthorized.message}`)

  const authorized = await checkAuthorized(cronUrl, cronSecret)
  console.log(`${authorized.ok ? '✅' : '❌'} ${authorized.message}`)

  if (!unauthorized.ok || !authorized.ok) {
    console.error('Cron endpoint verification failed.')
    process.exit(1)
  }

  console.log('Cron endpoint verification passed.')
}

main().catch((error: unknown) => {
  console.error('Cron verification crashed:', error)
  process.exit(1)
})
