// Test doubles for services that need a model download or a network.
import type { ChunkRecord } from '../../src/ingest/records'
import type { Embedder } from '../../src/server/embedder'
import { type IngestSummary, SENTINEL_ID, type VectorStore } from '../../src/server/store'

/** Deterministic unit vectors derived from a hash of each text. */
export function fakeEmbedder(dimension = 384): Embedder & { inputs: string[] } {
  const inputs: string[] = []
  return {
    dimension,
    inputs,
    async embed(texts) {
      inputs.push(...texts)
      return texts.map(text => {
        let seed = Number(Bun.hash(text) % 2147483647n) || 1
        const vector = Array.from({ length: dimension }, () => {
          seed = (seed * 48271) % 2147483647
          return seed / 2147483647 - 0.5
        })
        const norm = Math.hypot(...vector)
        return vector.map(v => v / norm)
      })
    },
  }
}

/** In-memory VectorStore that records the order of writes. */
export function memoryStore(namespace = 'test'): VectorStore & { records: Map<string, ChunkRecord>; writes: string[] } {
  const records = new Map<string, ChunkRecord>()
  const writes: string[] = []
  let sentinel: IngestSummary | null = null
  return {
    namespace,
    records,
    writes,
    async ensureIndex() {},
    async state() {
      return { records: records.size, sentinel }
    },
    async upsert(batch) {
      for (const record of batch) {
        records.set(record.id, record)
        writes.push(record.id)
      }
    },
    async writeSentinel(summary) {
      sentinel = summary
      writes.push(SENTINEL_ID)
    },
    async reset() {
      records.clear()
      sentinel = null
    },
  }
}
