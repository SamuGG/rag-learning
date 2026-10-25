import { afterAll, beforeAll, expect, setDefaultTimeout, test } from 'bun:test'
import { openBrowser, type RunningApp, startApp, visit, waitFor } from './app'

setDefaultTimeout(60_000)

let app: RunningApp
let view: Bun.WebView

beforeAll(async () => {
  app = await startApp()
  view = openBrowser()
})

afterAll(() => {
  view?.close()
  app?.stop()
})

const text = (selector: string) =>
  view.evaluate<string | null>(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`)

test('renders the page with Tailwind styles', async () => {
  await visit(view, app.baseUrl)
  expect(await text('[data-testid="title"]')).toBe('Screenplay RAG Chat')
  const colour = await view.evaluate<string>(`getComputedStyle(document.querySelector('[data-testid="title"]')).color`)
  expect(colour).not.toBe('rgb(0, 0, 0)')
})

test('calls a server function running on Bun', async () => {
  await visit(view, app.baseUrl)
  await view.click('button:nth-of-type(1)')
  const status = await waitFor(async () => (await text('[data-testid="status"]')) ?? undefined)
  expect(status).toContain('"runtime": "bun ')
})

test('reads a streamed response', async () => {
  await visit(view, app.baseUrl)
  await view.click('button:nth-of-type(2)')
  const streamed = await waitFor(async () => {
    const value = await text('[data-testid="stream"]')
    return value?.includes('bun') ? value : undefined
  })
  expect(streamed.trim().split('\n')).toEqual(['streaming', 'works', 'on', 'bun'])
})
