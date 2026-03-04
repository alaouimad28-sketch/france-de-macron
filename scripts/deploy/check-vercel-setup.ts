#!/usr/bin/env tsx

import { readFile } from 'node:fs/promises'

type Check = { ok: boolean; message: string }

type VercelConfig = {
  crons?: Array<{ path?: string; schedule?: string }>
}

async function main() {
  const checks: Check[] = []

  const vercelRaw = await readFile('apps/web/vercel.json', 'utf8')
  const vercelConfig = JSON.parse(vercelRaw) as VercelConfig

  const cron = vercelConfig.crons?.find((item) => item.path === '/api/cron/fuel-daily')
  if (!cron) {
    checks.push({
      ok: false,
      message: 'Missing cron path /api/cron/fuel-daily in apps/web/vercel.json',
    })
  } else {
    checks.push({
      ok: true,
      message: 'Cron path /api/cron/fuel-daily found in apps/web/vercel.json',
    })

    if (cron.schedule !== '30 2 * * *') {
      checks.push({
        ok: false,
        message: `Unexpected cron schedule for /api/cron/fuel-daily (expected "30 2 * * *")`,
      })
    } else {
      checks.push({ ok: true, message: 'Cron schedule is 30 2 * * * (02:30 UTC)' })
    }
  }

  for (const check of checks) {
    console.log(`${check.ok ? '✅' : '❌'} ${check.message}`)
  }

  const failed = checks.filter((check) => !check.ok)
  if (failed.length > 0) {
    process.exit(1)
  }

  console.log('Vercel setup checks passed.')
}

main().catch((error: unknown) => {
  console.error('check-vercel-setup failed:', error)
  process.exit(1)
})
