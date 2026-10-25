import { For, onCleanup, onMount, Show } from 'solid-js'
import { chunkLabel } from '~/rag/prompts'
import type { RetrievedChunk } from '~/rag/types'

interface SourcesProps {
  messageId: string
  chunks: RetrievedChunk[]
  cited: number[]
  hypothesis?: string
}

/** Collapsible list of the scenes an answer was based on; citations link to `#<messageId>-src-<n>`. */
export function Sources(props: SourcesProps) {
  let panel: HTMLDetailsElement | undefined
  // Following a citation link (#<messageId>-src-<n>) opens the collapsed list so the linked scene is visible.
  // The router handles in-page links with pushState (no hashchange event), so listen for the link click itself;
  // pressing Enter on a focused link produces a click too.
  const openForCitation = (event: MouseEvent) => {
    const link = (event.target as Element | null)?.closest?.('a.citation')
    if (panel && link?.getAttribute('href')?.startsWith(`#${props.messageId}-src-`)) panel.open = true
  }
  onMount(() => {
    document.addEventListener('click', openForCitation)
    onCleanup(() => document.removeEventListener('click', openForCitation))
  })

  return (
    <details ref={panel} class='sources mt-3 rounded border border-slate-200 bg-slate-50 text-sm' data-testid='sources'>
      <summary class='cursor-pointer px-3 py-2 text-slate-600'>
        Sources ({props.chunks.length}){props.cited.length > 0 ? `, ${props.cited.length} cited` : ''}
      </summary>
      <ol class='space-y-2 px-3 pb-3'>
        <For each={props.chunks}>
          {(chunk, i) => (
            <li
              id={`${props.messageId}-src-${i() + 1}`}
              class='rounded border border-slate-200 bg-white p-2 target:ring-2 target:ring-sky-400'
              classList={{ 'border-sky-300': props.cited.includes(i() + 1) }}
              data-testid='source'
            >
              <div class='flex items-baseline justify-between gap-2'>
                <span class='font-medium text-slate-800'>
                  [{i() + 1}] {chunkLabel(chunk)}
                </span>
                <span class='shrink-0 text-xs text-slate-500'>score {chunk.score.toFixed(3)}</span>
              </div>
              <details class='mt-1'>
                <summary class='cursor-pointer text-xs text-slate-500'>Show excerpt</summary>
                <pre class='mt-1 whitespace-pre-wrap font-mono text-xs text-slate-700'>{chunk.text}</pre>
              </details>
            </li>
          )}
        </For>
      </ol>
      <Show when={props.hypothesis}>
        <details class='px-3 pb-3'>
          <summary class='cursor-pointer text-xs text-slate-500'>Search passage (HyDE)</summary>
          <pre class='mt-1 whitespace-pre-wrap font-mono text-xs text-slate-600'>{props.hypothesis}</pre>
        </details>
      </Show>
    </details>
  )
}
