import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Server } from 'bun'
import type { ChatEvent } from '../../src/server/llm'
import { createOllamaChatModel } from '../../src/server/ollama'

let server: Server<undefined>
const requests: Record<string, unknown>[] = []

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const body = (await req.json()) as Record<string, unknown>
      requests.push(body)
      if (body.model === 'missing') return new Response('{"error":"model not found"}', { status: 404 })
      if (!body.stream) {
        return Response.json({ message: { content: 'ready', thinking: '' }, done: true, prompt_eval_count: 12 })
      }
      // NDJSON split at awkward byte boundaries, with a thinking field that must be ignored.
      const lines = [
        { message: { content: 'Hel', thinking: 'hidden' }, done: false },
        { message: { content: 'lo' }, done: false },
        { message: { content: '' }, done: true, prompt_eval_count: 40, eval_count: 2 },
      ]
        .map(line => `${JSON.stringify(line)}\n`)
        .join('')
      const stream = new ReadableStream({
        start(controller) {
          for (let i = 0; i < lines.length; i += 7) controller.enqueue(new TextEncoder().encode(lines.slice(i, i + 7)))
          controller.close()
        },
      })
      return new Response(stream, { headers: { 'content-type': 'application/x-ndjson' } })
    },
  })
})

afterAll(() => server.stop(true))

const model = (name = 'qwen3.5:4b') =>
  createOllamaChatModel({
    host: `http://127.0.0.1:${server.port}`,
    model: name,
    numCtx: 8192,
    temperature: 0.7,
    think: false,
  })

describe('Ollama chat model', () => {
  test('generate sends think:false, a fixed num_ctx and the token limit', async () => {
    const result = await model().generate([{ role: 'user', content: 'hi' }], { maxTokens: 64 })
    expect(result).toEqual({ content: 'ready', promptTokens: 12, completionTokens: undefined })
    expect(requests.at(-1)).toMatchObject({
      stream: false,
      think: false,
      keep_alive: '10m',
      options: { num_ctx: 8192, temperature: 0.7, num_predict: 64 },
    })
  })

  test('stream yields tokens and usage from NDJSON split across chunks', async () => {
    const events: ChatEvent[] = []
    for await (const event of model().stream([{ role: 'user', content: 'hi' }])) events.push(event)
    expect(events).toEqual([
      { type: 'token', text: 'Hel' },
      { type: 'token', text: 'lo' },
      { type: 'done', promptTokens: 40, completionTokens: 2 },
    ])
    expect(requests.at(-1)).toMatchObject({ options: { num_ctx: 8192 } })
  })

  test('explains a missing model', async () => {
    await expect(model('missing').generate([{ role: 'user', content: 'hi' }])).rejects.toThrow('ollama pull missing')
  })

  test('explains an unreachable server', async () => {
    const offline = createOllamaChatModel({
      host: 'http://127.0.0.1:9',
      model: 'm',
      numCtx: 1,
      temperature: 0,
      think: false,
    })
    await expect(offline.generate([{ role: 'user', content: 'hi' }])).rejects.toThrow('Ollama is unreachable')
  })
})
