// Spike (#6): a streamed response from a Bun-hosted route.
export function GET() {
  const encoder = new TextEncoder()
  const words = ['streaming', 'works', 'on', 'bun']
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(encoder.encode(`${word}\n`))
        await Bun.sleep(50)
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
