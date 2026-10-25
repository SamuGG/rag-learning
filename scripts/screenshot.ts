// Regenerates docs/images/chat.png from the production build with fake services (canned answer).
// Usage: bun run screenshot   (builds first)
import { openBrowser, startApp, visit, waitFor } from '../e2e/app'

const OUTPUT = 'docs/images/chat.png'
const app = await startApp(3120, { FAKE_SERVICES: 'true' })
const view = openBrowser({ width: 880, height: 700 })
try {
  await visit(view, app.baseUrl)
  await view.click('[data-testid="question"]')
  await view.type('Who is trying to fix the engine, and how hopeful are they?')
  await view.press('Enter')
  await waitFor(async () =>
    (await view.evaluate<number>('document.querySelectorAll("[data-testid=send]").length')) === 1 ? true : undefined,
  )
  await view.click('[data-testid="answer"] a.citation')
  await Bun.write(OUTPUT, await view.screenshot({ encoding: 'buffer', format: 'png' }))
  console.log(`Wrote ${OUTPUT}`)
} finally {
  view.close()
  app.stop()
}
