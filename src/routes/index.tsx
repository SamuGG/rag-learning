import { createResource, createSignal, Show } from 'solid-js'
import { getSpikeStatus } from '~/server/spike'

export default function Home() {
  const [deep, setDeep] = createSignal(false)
  const [status] = createResource(deep, value => getSpikeStatus(value))
  const [streamed, setStreamed] = createSignal('')

  const readStream = async () => {
    setStreamed('')
    const response = await fetch('/api/stream')
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      setStreamed(text => text + decoder.decode(value))
    }
  }

  return (
    <main class='mx-auto max-w-2xl p-6 text-slate-800'>
      <h1 data-testid='title' class='text-3xl font-semibold text-sky-700'>
        Screenplay RAG Chat
      </h1>
      <p class='mt-2 text-slate-600'>Placeholder page. The chat UI arrives in milestone M4.</p>
      <section class='mt-6 space-y-3'>
        <div class='flex gap-2'>
          <button type='button' class='rounded bg-sky-700 px-3 py-1 text-white' onClick={() => setDeep(true)}>
            Check services
          </button>
          <button type='button' class='rounded bg-slate-700 px-3 py-1 text-white' onClick={readStream}>
            Test streaming
          </button>
        </div>
        <Show when={status()}>{value => <pre data-testid='status'>{JSON.stringify(value(), null, 2)}</pre>}</Show>
        <pre data-testid='stream'>{streamed()}</pre>
      </section>
    </main>
  )
}
