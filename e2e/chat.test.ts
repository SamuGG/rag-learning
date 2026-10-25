// End-to-end tests of the chat page against the production build with FAKE_SERVICES=true.
// Run: bun run build && bun run e2e
import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { openBrowser, type RunningApp, startApp, visit, waitFor } from './app'

setDefaultTimeout(60_000)

let app: RunningApp
let view: Bun.WebView

beforeAll(async () => {
  app = await startApp(3100, { FAKE_SERVICES: 'true' })
  view = openBrowser()
})

afterAll(() => {
  view?.close()
  app?.stop()
})

const evaluate = <T>(script: string) => view.evaluate<T>(script)
const text = (selector: string) =>
  evaluate<string | null>(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`)
const count = (selector: string) => evaluate<number>(`document.querySelectorAll(${JSON.stringify(selector)}).length`)

async function ask(question: string) {
  await view.click('[data-testid="question"]')
  await view.type(question)
  await view.press('Enter')
  // Done when the Send button is back (the Stop button shows while streaming).
  await waitFor(async () => ((await count('[data-testid="send"]')) === 1 ? true : undefined))
}

describe('chat page', () => {
  test('shows the title, Tailwind styles and service status', async () => {
    await visit(view, app.baseUrl)
    expect(await text('[data-testid="title"]')).toBe('Screenplay RAG Chat')
    const colour = await evaluate<string>(`getComputedStyle(document.querySelector('[data-testid="title"]')).color`)
    expect(colour).not.toBe('rgb(0, 0, 0)')
    const status = await waitFor(async () => {
      const line = await text('[data-testid="status-line"]')
      return line?.includes('fake services') ? line : undefined
    })
    expect(status).toContain('2 documents, 2 chunks')
  })

  test('streams an answer with a linked citation and sources', async () => {
    await visit(view, app.baseUrl)
    await ask('Who repairs the engine?')

    expect(await text('[data-testid="message-user"]')).toBe('Who repairs the engine?')
    const answer = await text('[data-testid="answer"]')
    expect(answer).toContain('old droid repairs the frozen engine')
    expect(await evaluate<string>(`document.querySelector('[data-testid="answer"] strong')?.textContent`)).toBe(
      'old droid',
    )
    expect(await count('[data-testid="answer"] a.citation')).toBe(1)
    expect(await count('[data-testid="source"]')).toBe(2)
    expect(await text('[data-testid="sources"] summary')).toContain('Sources (2), 1 cited')
    expect(await count('[data-testid="unverified"]')).toBe(0)

    await view.click('[data-testid="answer"] a.citation')
    await waitFor(async () =>
      (await evaluate<boolean>(`document.querySelector('[data-testid="sources"]').open`)) ? true : undefined,
    )
  })

  test('keeps the conversation, then New chat clears it', async () => {
    await visit(view, app.baseUrl)
    await ask('Who repairs the engine?')
    await ask('And how hopeful are they?')
    expect(await count('[data-testid="message-user"]')).toBe(2)
    expect(await count('[data-testid="message-assistant"]')).toBe(2)

    await view.click('[data-testid="new-chat"]')
    await waitFor(async () => ((await count('[data-testid="message-user"]')) === 0 ? true : undefined))
  })

  test('shows model errors in the conversation', async () => {
    await visit(view, app.baseUrl)
    await ask('Please simulate an error')
    expect(await text('[data-testid="error"]')).toContain('Fake model failure')
  })
})
