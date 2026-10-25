import type { Scene } from './types'

/** Metadata stored with every chunk vector. A missing `heading` means the chunk has none. */
export interface ChunkMetadata {
  kind: 'chunk'
  imdb_id: string
  title: string
  scene_index: number
  chunk_index: number
  heading?: string
  text: string
}

export interface ChunkRecord {
  id: string
  values: number[]
  metadata: ChunkMetadata
}

/** Pinecone allows 40 KB of metadata per record; stay safely below it. */
export const MAX_METADATA_BYTES = 38 * 1024
/** Pinecone upsert limits: 1000 records and 2 MB per request. */
export const MAX_BATCH_RECORDS = 1000
export const MAX_BATCH_BYTES = 2 * 1024 * 1024
const MAX_LABEL_LENGTH = 300

export class RecordTooLargeError extends Error {
  override name = 'RecordTooLargeError'
}

export const recordId = (scene: Pick<Scene, 'imdbId' | 'sceneIndex' | 'chunkIndex'>) =>
  `${scene.imdbId}:${scene.sceneIndex}:${scene.chunkIndex}`

/** Removes control characters and caps the length of short labels (titles, headings). */
export function sanitiseLabel(label: string): string {
  return label
    .replace(/\p{Cc}/gu, ' ')
    .trim()
    .slice(0, MAX_LABEL_LENGTH)
}

const encoder = new TextEncoder()
const byteLength = (value: unknown) => encoder.encode(JSON.stringify(value)).length

/** Builds the stored record for one chunk. The chunk text is kept exactly as split. */
export function toRecord(scene: Scene, title: string, values: number[]): ChunkRecord {
  const metadata: ChunkMetadata = {
    kind: 'chunk',
    imdb_id: scene.imdbId,
    title: sanitiseLabel(title),
    scene_index: scene.sceneIndex,
    chunk_index: scene.chunkIndex,
    ...(scene.heading === null ? {} : { heading: sanitiseLabel(scene.heading) }),
    text: scene.text,
  }
  const id = recordId(scene)
  const size = byteLength(metadata)
  if (size > MAX_METADATA_BYTES) {
    throw new RecordTooLargeError(`${id}: metadata is ${size} bytes; the limit is ${MAX_METADATA_BYTES}`)
  }
  return { id, values, metadata }
}

/** Splits records into upsert batches within Pinecone's record-count and payload-size limits. */
export function batchRecords<T>(records: readonly T[], maxRecords = MAX_BATCH_RECORDS, maxBytes = MAX_BATCH_BYTES) {
  const batches: T[][] = []
  let batch: T[] = []
  let bytes = 0
  for (const record of records) {
    const size = byteLength(record)
    if (batch.length > 0 && (batch.length >= maxRecords || bytes + size > maxBytes)) {
      batches.push(batch)
      batch = []
      bytes = 0
    }
    batch.push(record)
    bytes += size
  }
  if (batch.length > 0) batches.push(batch)
  return batches
}
