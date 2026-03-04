#!/usr/bin/env tsx

import { access } from 'node:fs/promises'
import { constants } from 'node:fs'

async function assertReadable(path: string): Promise<void> {
  await access(path, constants.R_OK)
}

async function main() {
  const checks: Array<{ ok: boolean; message: string }> = []

  try {
    await assertReadable('apps/web/public/robots.txt')
    checks.push({ ok: true, message: 'robots.txt present' })
  } catch {
    checks.push({ ok: false, message: 'Missing apps/web/public/robots.txt' })
  }

  try {
    await assertReadable('apps/web/src/app/sitemap.ts')
    checks.push({ ok: true, message: 'sitemap.ts present' })
  } catch {
    checks.push({ ok: false, message: 'Missing apps/web/src/app/sitemap.ts' })
  }

  for (const check of checks) {
    console.log(`${check.ok ? '✅' : '❌'} ${check.message}`)
  }

  const failed = checks.filter((check) => !check.ok)
  if (failed.length > 0) {
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error('verify-production failed:', error)
  process.exit(1)
})
