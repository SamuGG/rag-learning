import { createResource, createSignal, For, onCleanup, Show } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { isServer } from 'solid-js/web'
import { ChatMessage, type Message } from '~/components/ChatMessage'
import { readNdjson } from '~/lib/ndjson'
import { resolveCitations } from '~/rag/citations'
import { DEFAULT_CHARS_PER_TOKEN } from '~/rag/history'
import type { Turn } from '~/rag/types'
import type { ChatStreamEvent } from '~/routes/api/chat'
import type { ServiceStatus } from '~/server/chat-service'

const fetchStatus = async (): Promise<ServiceStatus> => (await fetch('/api/status')).json()

let nextId = 0
const newId = () => `m${++nextId}`

export default function Chat() {
  // Browser only: the status endpoint is fetched after hydration, never during server rendering.
  const [status, { refetch }] = createResource(() => !isServer, fetchStatus)
  const [messages, setMessages] = createStore<Message[]>([])
  const [question, setQuestion] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  let charsPerToken = DEFAULT_CHARS_PER_TOKEN
  let controller: AbortController | undefined
  let bottom: HTMLDivElement | undefined
  onCleanup(() => controller?.abort())

  const history = (): Turn[] =>
    messages
      .filter(m => !m.streaming && !m.error)
      .map(m => ({ role: m.role, content: m.role === 'assistant' ? (m.historyContent ?? m.content) : m.content }))

  const update = (id: string, change: (message: Message) => void) =>
    setMessages(
      m => m.id === id,
      produce(message => change(message)),
    )

  const handle = (id: string, event: ChatStreamEvent) => {
    switch (event.type) {
      case 'hypothesis':
        return update(id, m => (m.hypothesis = event.text))
      case 'sources':
        return update(id, m => (m.sources = event.chunks))
      case 'history-trimmed':
        return update(id, m => (m.trimmed = event.dropped))
      case 'token':
        update(id, m => (m.content += event.text))
        return bottom?.scrollIntoView({ block: 'end' })
      case 'done':
        charsPerToken = event.charsPerToken
        return update(id, m => {
          m.streaming = false
          m.historyContent = resolveCitations(event.answer, m.sources ?? [])
        })
      case 'error':
        return update(id, m => {
          m.streaming = false
          m.error = event.message
        })
    }
  }

  const ask = async (event: SubmitEvent) => {
    event.preventDefault()
    const text = question().trim()
    if (!text || busy()) return
    const turns = history()
    const userId = newId()
    const answerId = newId()
    setMessages(messages.length, { id: userId, role: 'user', content: text })
    setMessages(messages.length, { id: answerId, role: 'assistant', content: '', streaming: true })
    setQuestion('')
    setBusy(true)
    controller = new AbortController()
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: text, history: turns, charsPerToken }),
        signal: controller.signal,
      })
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        handle(answerId, { type: 'error', message: body.error ?? `Request failed (HTTP ${response.status})` })
        return
      }
      for await (const streamEvent of readNdjson<ChatStreamEvent>(response.body)) handle(answerId, streamEvent)
      update(answerId, m => {
        if (m.streaming) {
          m.streaming = false
          m.error ??= 'The answer stopped unexpectedly.'
        }
      })
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError'
      update(answerId, m => {
        m.streaming = false
        if (aborted) m.error = 'Stopped.'
        else m.error = `Could not reach the server: ${error instanceof Error ? error.message : error}`
      })
    } finally {
      setBusy(false)
      controller = undefined
    }
  }

  const newChat = () => {
    controller?.abort()
    setMessages([])
    charsPerToken = DEFAULT_CHARS_PER_TOKEN
    void refetch()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      ;(event.currentTarget as HTMLTextAreaElement).form?.requestSubmit()
    }
  }

  const unavailable = () => status()?.ok === false

  return (
    <main class='mx-auto flex min-h-screen max-w-3xl flex-col px-4'>
      <header class='sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-100/90 py-3 backdrop-blur'>
        <div>
          <h1 data-testid='title' class='text-xl font-semibold text-sky-800'>
            Screenplay RAG Chat
          </h1>
          <p class='text-xs text-slate-500' data-testid='status-line'>
            <Show when={status()} fallback='Checking services…'>
              {s => (
                <>
                  {s().model ?? 'no model'} · namespace {s().namespace ?? '?'}
                  <Show when={s().ingestion}>{i => ` · ${i().documents} documents, ${i().chunks} chunks`}</Show>
                  <Show when={s().fake}> · fake services</Show>
                </>
              )}
            </Show>
          </p>
        </div>
        <button
          type='button'
          class='rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50'
          onClick={newChat}
          data-testid='new-chat'
        >
          New chat
        </button>
      </header>

      <Show when={status()?.error}>
        <p class='mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700' role='alert' data-testid='status-error'>
          {status()?.error}
        </p>
      </Show>
      <For each={status()?.warnings ?? []}>
        {warning => (
          <p class='mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800' data-testid='status-warning'>
            {warning}
          </p>
        )}
      </For>

      <section class='flex-1 space-y-4 py-4' aria-live='polite' data-testid='messages'>
        <Show when={messages.length === 0}>
          <p class='pt-16 text-center text-slate-500'>
            Ask about the screenplays you ingested. Answers cite scenes as [1], [2]… with sources below each answer.
          </p>
        </Show>
        <For each={messages}>{message => <ChatMessage message={message} />}</For>
        <div ref={bottom} />
      </section>

      <form class='sticky bottom-0 flex gap-2 border-t border-slate-200 bg-slate-100 py-3' onSubmit={ask}>
        <textarea
          class='min-h-[44px] flex-1 resize-y rounded border border-slate-300 bg-white px-3 py-2 text-slate-800 disabled:bg-slate-100'
          rows='2'
          placeholder={
            unavailable()
              ? 'Unavailable: see the message above'
              : 'Ask a question (Enter to send, Shift+Enter for a new line)'
          }
          value={question()}
          onInput={e => setQuestion(e.currentTarget.value)}
          onKeyDown={onKeyDown}
          disabled={unavailable()}
          maxLength={2000}
          data-testid='question'
        />
        <Show
          when={busy()}
          fallback={
            <button
              type='submit'
              class='rounded bg-sky-700 px-4 py-2 text-white disabled:opacity-50'
              disabled={unavailable() || question().trim() === ''}
              data-testid='send'
            >
              Send
            </button>
          }
        >
          <button
            type='button'
            class='rounded bg-slate-600 px-4 py-2 text-white'
            onClick={() => controller?.abort()}
            data-testid='stop'
          >
            Stop
          </button>
        </Show>
      </form>
    </main>
  )
}
