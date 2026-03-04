#!/usr/bin/env tsx

type CheckResult = {
  ok: boolean
  message: string
}

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'FUEL_API_BASE_URL',
  'FUEL_API_TIMEOUT_MS',
  'CRON_SECRET',
] as const

function fail(message: string): CheckResult {
  return { ok: false, message }
}

function pass(message: string): CheckResult {
  return { ok: true, message }
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function main() {
  const checks: CheckResult[] = []

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar]
    if (!value || value.trim().length === 0) {
      checks.push(fail(`Missing required env var: ${envVar}`))
    } else {
      checks.push(pass(`Env var present: ${envVar}`))
    }
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    checks.push(
      fail('Invalid env var: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY must never be defined'),
    )
  } else {
    checks.push(pass('Service role key is not exposed via NEXT_PUBLIC_ prefix'))
  }

  if (process.env.NEXT_PUBLIC_CRON_SECRET) {
    checks.push(fail('Invalid env var: NEXT_PUBLIC_CRON_SECRET must never be defined'))
  } else {
    checks.push(pass('CRON secret is not exposed via NEXT_PUBLIC_ prefix'))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl && !isValidHttpUrl(supabaseUrl)) {
    checks.push(fail('NEXT_PUBLIC_SUPABASE_URL must be a valid http(s) URL'))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl && !isValidHttpUrl(appUrl)) {
    checks.push(fail('NEXT_PUBLIC_APP_URL must be a valid http(s) URL'))
  }

  const fuelApiBaseUrl = process.env.FUEL_API_BASE_URL
  if (fuelApiBaseUrl && !isValidHttpUrl(fuelApiBaseUrl)) {
    checks.push(fail('FUEL_API_BASE_URL must be a valid http(s) URL'))
  }

  const fuelApiTimeoutRaw = process.env.FUEL_API_TIMEOUT_MS
  if (fuelApiTimeoutRaw) {
    const timeout = Number(fuelApiTimeoutRaw)
    if (!Number.isFinite(timeout) || timeout < 1000 || timeout > 120000) {
      checks.push(fail('FUEL_API_TIMEOUT_MS must be a number between 1000 and 120000 milliseconds'))
    }
  }

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && cronSecret.length < 32) {
    checks.push(fail('CRON_SECRET is too short (expected at least 32 chars)'))
  }

  const failedChecks = checks.filter((check) => !check.ok)
  for (const check of checks) {
    console.log(`${check.ok ? '✅' : '❌'} ${check.message}`)
  }

  if (failedChecks.length > 0) {
    console.error(`\nPreflight failed (${failedChecks.length} check(s)).`)
    process.exit(1)
  }

  console.log('\nPreflight passed.')
}

main()
