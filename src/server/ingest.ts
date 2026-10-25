import { splitScreenplay } from '../ingest/chunker'
import { embeddingPrefix } from '../ingest/prefix'
import { batchRecords, type ChunkRecord, toRecord } from '../ingest/records'
import type { SplitWarning, TokenCounter } from '../ingest/types'
import type { Document } from './documents'
import type { Embedder } from './embedder'
import { hasData, type IngestSummary, type VectorStore } from './store'

export class StoreNotEmptyError extends Error {
  override name = 'StoreNotEmptyError'
}

export interface IngestOptions {
  documents: readonly Document[]
  embedder: Embedder
  store: VectorStore
  counter: TokenCounter
  log?: (message: string) => void
}

export interface IngestResult extends IngestSummary {
  warnings: { imdbId: string; warning: SplitWarning }[]
}

/**
 * One-shot ingestion: refuses a namespace that already holds data, upserts every chunk, then writes
 * the sentinel record last so a partial run is detectable.
 */
export async function ingestAll(options: IngestOptions): Promise<IngestResult> {
  const { documents, embedder, store, counter, log = () => {} } = options

  await store.ensureIndex(embedder.dimension)
  const state = await store.state()
  if (hasData(state)) {
    const detail = state.sentinel
      ? `it was ingested at ${state.sentinel.ingestedAt}`
      : `it holds ${state.records} records from an incomplete ingestion`
    throw new StoreNotEmptyError(
      `Namespace "${store.namespace}" is not empty (${detail}). Run \`bun run reset-store --yes\` to re-ingest.`,
    )
  }

  const warnings: IngestResult['warnings'] = []
  let chunks = 0
  for (const { entry, source } of documents) {
    const prefix = embeddingPrefix(entry.title)
    const scenes = await splitScreenplay(entry.imdbId, source, {
      counter,
      prefix,
      onWarning: warning => warnings.push({ imdbId: entry.imdbId, warning }),
    })
    const vectors = await embedder.embed(scenes.map(scene => prefix(scene.heading) + scene.text))
    const records: ChunkRecord[] = scenes.map((scene, i) => toRecord(scene, entry.title, vectors[i] ?? []))
    for (const batch of batchRecords(records)) await store.upsert(batch)
    chunks += records.length
    log(`${entry.imdbId} ${entry.title}: ${records.length} ${records.length === 1 ? 'chunk' : 'chunks'}`)
  }

  const summary: IngestSummary = { documents: documents.length, chunks, ingestedAt: new Date().toISOString() }
  await store.writeSentinel(summary, embedder.dimension)
  return { ...summary, warnings }
}
