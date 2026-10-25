import { expect, test } from 'bun:test'
import { ndjsonResponse, readNdjson } from '../../src/lib/ndjson'

const streamOf = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
      controller.close()
    },
  })

test('parses objects split across chunks, including a final line without a newline', async () => {
  const values: unknown[] = []
  for await (const value of readNdjson(streamOf('{"a":', '1}\n\n{"b"', ':2}\n{"c":3}'))) values.push(value)
  expect(values).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
})

test('round-trips through ndjsonResponse', async () => {
  async function* events() {
    yield { type: 'token', text: 'Hi' }
    yield { type: 'done' }
  }
  const response = ndjsonResponse(events())
  expect(response.headers.get('content-type')).toContain('application/x-ndjson')
  const values: unknown[] = []
  for await (const value of readNdjson(response.body as ReadableStream<Uint8Array>)) values.push(value)
  expect(values).toEqual([{ type: 'token', text: 'Hi' }, { type: 'done' }])
})
