// Test doubles for services that need a model download or a network.
import type { ChunkRecord } from '../../src/ingest/records'
import type { RetrievedChunk } from '../../src/rag/types'
import type { Embedder } from '../../src/server/embedder'
import type { ChatMessage, ChatModel, GenerateOptions } from '../../src/server/llm'
import type { Retriever } from '../../src/server/retriever'
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

/** Chat model that returns canned text and records every request. */
export function fakeChatModel(
  hypothesis = 'EXT. CANYON - NIGHT\n\nA pilot repairs an engine.',
  answer = 'The pilot repairs the engine [Frozen Canyon — EXT. FROZEN CANYON - TWILIGHT].',
) {
  const calls: { kind: 'generate' | 'stream'; messages: readonly ChatMessage[]; options?: GenerateOptions }[] = []
  const model: ChatModel = {
    name: 'fake',
    async generate(messages, options) {
      calls.push({ kind: 'generate', messages, options })
      return { content: hypothesis, promptTokens: 50 }
    },
    async *stream(messages, options) {
      calls.push({ kind: 'stream', messages, options })
      for (const word of answer.split(/(?<= )/)) yield { type: 'token', text: word }
      const chars = messages.reduce((total, m) => total + m.content.length, 0)
      yield { type: 'done', promptTokens: Math.round(chars / 4), completionTokens: 20 }
    },
  }
  return Object.assign(model, { calls })
}

/** Retriever returning fixed chunks and recording the vectors it was asked about. */
export function fakeRetriever(chunks: RetrievedChunk[]): Retriever & { vectors: number[][] } {
  const vectors: number[][] = []
  return {
    vectors,
    async retrieve(vector, topK) {
      vectors.push(vector)
      return chunks.slice(0, topK)
    },
  }
}
