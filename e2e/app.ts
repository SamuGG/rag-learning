// Shared helpers for end-to-end tests driven by Bun.WebView.
import type { Subprocess } from 'bun'

export interface RunningApp {
  baseUrl: string
  stop(): void
}

const waitForServer = async (url: string, timeoutMs = 15_000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // not up yet
    }
    await Bun.sleep(200)
  }
  throw new Error(`Server did not start at ${url}`)
}

/** Uses E2E_BASE_URL when set; otherwise starts the production build (run `bun run build` first). */
export async function startApp(port = 3100): Promise<RunningApp> {
  const external = process.env.E2E_BASE_URL
  if (external) return { baseUrl: external, stop: () => {} }
  if (!(await Bun.file('.output/server/index.mjs').exists())) {
    throw new Error('No production build found. Run `bun run build` or set E2E_BASE_URL.')
  }
  const proc: Subprocess = Bun.spawn(['bun', '.output/server/index.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    stdout: 'ignore',
    stderr: 'inherit',
  })
  const baseUrl = `http://127.0.0.1:${port}`
  await waitForServer(baseUrl)
  return { baseUrl, stop: () => proc.kill() }
}

/** WebKit on macOS; Chrome/Chromium elsewhere (found automatically or via BUN_CHROME_PATH). */
export function openBrowser(): Bun.WebView {
  if (process.platform === 'darwin') return new Bun.WebView({ headless: true })
  // Chrome refuses to start its sandbox as root (CI containers, cloud sessions).
  const argv = process.getuid?.() === 0 ? ['--no-sandbox'] : []
  return new Bun.WebView({ headless: true, backend: { type: 'chrome', url: false, argv } })
}

export async function waitFor<T>(probe: () => Promise<T | undefined>, timeoutMs = 20_000): Promise<T> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await probe()
    if (value !== undefined) return value
    await Bun.sleep(100)
  }
  throw new Error('Timed out waiting for condition')
}

/** Navigates and waits until the client has hydrated. */
export async function visit(view: Bun.WebView, url: string): Promise<void> {
  await view.navigate(url)
  await waitFor(async () =>
    (await view.evaluate<boolean>('document.body.dataset.hydrated === "true"')) ? true : undefined,
  )
}
