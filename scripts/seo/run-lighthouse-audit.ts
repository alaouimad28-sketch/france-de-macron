import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { startWebServer } from '../qa/common'

interface LighthouseCategory {
  score: number | null
}

interface LighthouseAuditNumeric {
  numericValue?: number
}

interface LighthouseResult {
  categories: {
    performance?: LighthouseCategory
    accessibility?: LighthouseCategory
    seo?: LighthouseCategory
    ['best-practices']?: LighthouseCategory
  }
  audits: {
    ['largest-contentful-paint']?: LighthouseAuditNumeric
    ['cumulative-layout-shift']?: LighthouseAuditNumeric
    ['interaction-to-next-paint']?: LighthouseAuditNumeric
  }
}

interface AuditPageResult {
  path: string
  url: string
  jsonPath: string
  htmlPath: string
  performance: number
  accessibility: number
  seo: number
  bestPractices: number
  lcpMs: number
  cls: number
  inpMs: number | null
  passCategories: boolean
  passVitals: boolean
}

const CATEGORY_THRESHOLDS = {
  performance: 85,
  accessibility: 90,
  seo: 90,
  bestPractices: 90,
} as const

const VITAL_THRESHOLDS = {
  lcpMs: 2500,
  cls: 0.1,
  inpMs: 200,
} as const

function getRepoRoot(): string {
  return process.cwd().endsWith('/scripts') ? resolve(process.cwd(), '..') : process.cwd()
}

function sanitizePath(pathname: string): string {
  if (pathname === '/') {
    return 'home'
  }

  return pathname.replace(/^\//, '').replace(/\//g, '-')
}

function scoreTo100(score: number | null | undefined): number {
  if (typeof score !== 'number') {
    return 0
  }

  return Math.round(score * 100)
}

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
    })

    child.on('error', rejectPromise)
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }

      rejectPromise(new Error(`Command failed (${command} ${args.join(' ')}), exit code ${code}`))
    })
  })
}

async function runLighthouse(
  url: string,
  outputPath: string,
  format: 'json' | 'html',
  cwd: string,
) {
  await runCommand(
    'pnpm',
    [
      'exec',
      'lighthouse',
      url,
      '--quiet',
      '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage',
      '--throttling-method=simulate',
      '--preset=desktop',
      '--only-categories=performance,accessibility,best-practices,seo',
      `--output=${format}`,
      `--output-path=${outputPath}`,
    ],
    cwd,
  )
}

function parseLighthouseJson(
  raw: string,
  pagePath: string,
  url: string,
  jsonPath: string,
  htmlPath: string,
): AuditPageResult {
  const parsed = JSON.parse(raw) as LighthouseResult

  const performance = scoreTo100(parsed.categories.performance?.score)
  const accessibility = scoreTo100(parsed.categories.accessibility?.score)
  const seo = scoreTo100(parsed.categories.seo?.score)
  const bestPractices = scoreTo100(parsed.categories['best-practices']?.score)

  const lcpMs = parsed.audits['largest-contentful-paint']?.numericValue ?? Number.POSITIVE_INFINITY
  const cls = parsed.audits['cumulative-layout-shift']?.numericValue ?? Number.POSITIVE_INFINITY
  const inpRaw = parsed.audits['interaction-to-next-paint']?.numericValue
  const inpMs = typeof inpRaw === 'number' ? inpRaw : null

  const passCategories =
    performance >= CATEGORY_THRESHOLDS.performance &&
    accessibility >= CATEGORY_THRESHOLDS.accessibility &&
    seo >= CATEGORY_THRESHOLDS.seo &&
    bestPractices >= CATEGORY_THRESHOLDS.bestPractices

  const passVitals =
    lcpMs <= VITAL_THRESHOLDS.lcpMs &&
    cls <= VITAL_THRESHOLDS.cls &&
    (inpMs === null || inpMs <= VITAL_THRESHOLDS.inpMs)

  return {
    path: pagePath,
    url,
    jsonPath,
    htmlPath,
    performance,
    accessibility,
    seo,
    bestPractices,
    lcpMs,
    cls,
    inpMs,
    passCategories,
    passVitals,
  }
}

function buildMarkdown(results: AuditPageResult[], runDir: string): string {
  const lines: string[] = []

  lines.push('# Lighthouse Audit Report')
  lines.push('')
  lines.push(`- Generated at: ${new Date().toISOString()}`)
  lines.push(`- Artifacts dir: ${runDir}`)
  lines.push(
    `- Category thresholds: perf >= ${CATEGORY_THRESHOLDS.performance}, a11y >= ${CATEGORY_THRESHOLDS.accessibility}, seo >= ${CATEGORY_THRESHOLDS.seo}, best-practices >= ${CATEGORY_THRESHOLDS.bestPractices}`,
  )
  lines.push(
    `- Core Web Vitals (lab proxy) thresholds: LCP <= ${VITAL_THRESHOLDS.lcpMs}ms, CLS <= ${VITAL_THRESHOLDS.cls}, INP <= ${VITAL_THRESHOLDS.inpMs}ms (if available)`,
  )
  lines.push('')
  lines.push('| Path | Perf | A11y | SEO | Best | LCP (ms) | CLS | INP (ms) | Categories | CWV |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: | :---: |')

  for (const result of results) {
    lines.push(
      `| ${result.path} | ${result.performance} | ${result.accessibility} | ${result.seo} | ${result.bestPractices} | ${Math.round(result.lcpMs)} | ${result.cls.toFixed(3)} | ${result.inpMs === null ? 'n/a' : Math.round(result.inpMs)} | ${result.passCategories ? '✅' : '❌'} | ${result.passVitals ? '✅' : '❌'} |`,
    )
  }

  return `${lines.join('\n')}\n`
}

async function main() {
  const repoRoot = getRepoRoot()
  const artifactRoot = resolve(
    repoRoot,
    process.env.LIGHTHOUSE_ARTIFACT_DIR ?? 'artifacts/lighthouse',
  )
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const runDir = join(artifactRoot, timestamp)
  const latestDir = join(artifactRoot, 'latest')
  const pages = (process.env.LIGHTHOUSE_PATHS ?? '/,/about,/methodology,/disclaimer')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (pages.length === 0) {
    throw new Error('LIGHTHOUSE_PATHS resolved to zero pages')
  }

  await mkdir(runDir, { recursive: true })

  const externalBaseUrl = process.env.LIGHTHOUSE_BASE_URL
  const server = externalBaseUrl
    ? null
    : await startWebServer(Number(process.env.LIGHTHOUSE_PORT ?? 4020))
  const baseUrl = externalBaseUrl ?? server?.baseUrl

  if (!baseUrl) {
    throw new Error('Unable to resolve base URL for Lighthouse run')
  }

  const pageResults: AuditPageResult[] = []

  try {
    for (const pagePath of pages) {
      const url = `${baseUrl}${pagePath}`
      const slug = sanitizePath(pagePath)
      const jsonPath = join(runDir, `${slug}.report.json`)
      const htmlPath = join(runDir, `${slug}.report.html`)

      await runLighthouse(url, jsonPath, 'json', repoRoot)
      await runLighthouse(url, htmlPath, 'html', repoRoot)

      const jsonRaw = await readFile(jsonPath, 'utf-8')
      pageResults.push(parseLighthouseJson(jsonRaw, pagePath, url, jsonPath, htmlPath))
    }
  } finally {
    if (server) {
      await server.stop()
    }
  }

  const reportPath = join(runDir, 'report.md')
  const summaryPath = join(runDir, 'summary.json')

  const markdown = buildMarkdown(pageResults, runDir)
  await writeFile(reportPath, markdown, 'utf-8')
  await writeFile(summaryPath, `${JSON.stringify(pageResults, null, 2)}\n`, 'utf-8')

  if (existsSync(latestDir)) {
    await rm(latestDir, { recursive: true, force: true })
  }
  await cp(runDir, latestDir, { recursive: true })

  console.log(markdown)
  console.log(`📦 Lighthouse artifacts written to: ${runDir}`)
  console.log(`📌 Latest pointer updated: ${latestDir}`)

  const failed = pageResults.filter((result) => !result.passCategories || !result.passVitals)

  if (failed.length > 0) {
    throw new Error(
      `Lighthouse/CWV thresholds failed on ${failed.map((item) => item.path).join(', ')}. See ${reportPath}`,
    )
  }
}

main().catch((error: unknown) => {
  console.error('❌ Lighthouse audit failed')
  console.error(error)
  process.exit(1)
})
