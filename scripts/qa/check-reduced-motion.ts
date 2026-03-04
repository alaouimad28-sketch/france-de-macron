import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { assert } from './common'

async function run() {
  const repoRoot = process.cwd().endsWith('/scripts') ? `${process.cwd()}/..` : process.cwd()
  const globalsCssPath = join(repoRoot, 'apps/web/src/app/globals.css')
  const scrollRevealPath = join(repoRoot, 'apps/web/src/components/layout/ScrollReveal.tsx')

  const [globalsCss, scrollReveal] = await Promise.all([
    readFile(globalsCssPath, 'utf8'),
    readFile(scrollRevealPath, 'utf8'),
  ])

  assert(
    globalsCss.includes('@media (prefers-reduced-motion: reduce)'),
    '[reduced-motion] globals.css must define a prefers-reduced-motion fallback block',
  )
  assert(
    globalsCss.includes('scroll-behavior: auto'),
    '[reduced-motion] globals.css must disable smooth scroll under reduced motion',
  )
  assert(
    scrollReveal.includes("window.matchMedia('(prefers-reduced-motion: reduce)')"),
    '[reduced-motion] ScrollReveal must guard animations with matchMedia',
  )

  console.log('✅ Reduced-motion coverage checks passed')
}

run().catch((error: unknown) => {
  console.error('❌ Reduced-motion coverage checks failed')
  console.error(error)
  process.exit(1)
})
