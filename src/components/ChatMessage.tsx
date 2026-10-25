import { Show } from 'solid-js'
import { renderMarkdown } from '~/lib/markdown'
import { findCitations, unmatchedCitations } from '~/rag/citations'
import type { RetrievedChunk } from '~/rag/types'
import { Sources } from './Sources'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: RetrievedChunk[]
  hypothesis?: string
  trimmed?: number
  error?: string
  streaming?: boolean
  /** Answer with citations resolved to labels, sent back as history. */
  historyContent?: string
}

export function ChatMessage(props: { message: Message }) {
  const m = () => props.message
  const sources = () => m().sources ?? []
  const html = () => renderMarkdown(m().content, { sourceCount: sources().length, sourceIdPrefix: `${m().id}-src-` })
  const unverified = () => (m().streaming ? [] : unmatchedCitations(m().content, sources().length))

  return (
    <div class={m().role === 'user' ? 'flex justify-end' : 'flex justify-start'} data-testid={`message-${m().role}`}>
      <div
        class='max-w-[85%] rounded-lg px-4 py-3'
        classList={{
          'bg-sky-700 text-white': m().role === 'user',
          'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200': m().role === 'assistant',
        }}
      >
        <Show when={m().role === 'assistant'} fallback={<p class='whitespace-pre-wrap'>{m().content}</p>}>
          <Show when={m().trimmed}>
            <p class='mb-2 text-xs text-amber-700'>
              Dropped {m().trimmed} older messages to fit the model's context window.
            </p>
          </Show>
          <Show when={m().content || !m().streaming} fallback={<p class='animate-pulse text-slate-400'>Thinking…</p>}>
            {/* renderMarkdown escapes all HTML before formatting. */}
            <div class='answer space-y-2' data-testid='answer' innerHTML={html()} />
          </Show>
          <Show when={m().error}>
            <p class='mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700' role='alert' data-testid='error'>
              {m().error}
            </p>
          </Show>
          <Show when={unverified().length > 0}>
            <p class='mt-2 text-xs text-amber-700' data-testid='unverified'>
              Unverified citation:{' '}
              {unverified()
                .map(n => `[${n}]`)
                .join(', ')}{' '}
              matches no source.
            </p>
          </Show>
          <Show when={sources().length > 0}>
            <Sources
              messageId={m().id}
              chunks={sources()}
              cited={findCitations(m().content)}
              hypothesis={m().hypothesis}
            />
          </Show>
        </Show>
      </div>
    </div>
  )
}
