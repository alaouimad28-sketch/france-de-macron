import { spawn, type ChildProcess } from 'node:child_process'

export interface RunningServer {
  process: ChildProcess
  baseUrl: string
  stop: () => Promise<void>
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getRepoRoot(): string {
  return process.cwd().endsWith('/scripts') ? `${process.cwd()}/..` : process.cwd()
}

async function stopProcess(processRef: ChildProcess): Promise<void> {
  if (processRef.exitCode !== null || processRef.killed) {
    return
  }

  processRef.kill('SIGTERM')

  const exited = await Promise.race([
    new Promise<boolean>((resolve) => processRef.once('exit', () => resolve(true))),
    sleep(1500).then(() => false),
  ])

  if (!exited && processRef.exitCode === null) {
    processRef.kill('SIGKILL')
    await Promise.race([
      new Promise<void>((resolve) => processRef.once('exit', () => resolve())),
      sleep(1000),
    ])
  }
}

export async function startWebServer(port = 4010): Promise<RunningServer> {
  const baseUrl = `http://127.0.0.1:${port}`
  const repoRoot = getRepoRoot()

  const serverProcess = spawn('pnpm', ['--filter', 'web', 'start', '-p', String(port)], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role-key',
    },
  })

  const timeoutMs = 30_000
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/about`)
      if (response.ok) {
        return {
          process: serverProcess,
          baseUrl,
          stop: async () => {
            await stopProcess(serverProcess)
          },
        }
      }
    } catch {
      // wait until server boot
    }

    if (serverProcess.exitCode !== null) {
      throw new Error(`Web server exited early with code ${serverProcess.exitCode}`)
    }

    await sleep(500)
  }

  await stopProcess(serverProcess)
  throw new Error(`Timed out waiting for web server at ${baseUrl}`)
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}
