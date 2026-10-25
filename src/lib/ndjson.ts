/** Parses a stream of newline-delimited JSON, tolerating objects split across chunks. */
export async function* readNdjson<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const decoder = new TextDecoder()
  const reader = body.getReader()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      let newline = buffer.indexOf('\n')
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (line) yield JSON.parse(line) as T
        newline = buffer.indexOf('\n')
      }
      if (done) break
    }
    const rest = buffer.trim()
    if (rest) yield JSON.parse(rest) as T
  } finally {
    reader.releaseLock()
  }
}

/** Encodes values as NDJSON for a streamed response. */
export function ndjsonResponse<T>(events: AsyncIterable<T>, signal?: AbortSignal): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          if (signal?.aborted) break
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        }
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8' } })
}
