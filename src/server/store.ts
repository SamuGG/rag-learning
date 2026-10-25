import { Pinecone, type RecordMetadata } from '@pinecone-database/pinecone'
import type { ChunkRecord } from '../ingest/records'

/** Written last by a successful ingestion; its presence means the namespace is complete. */
export const SENTINEL_ID = '__ingest__'

export interface IngestSummary {
  documents: number
  chunks: number
  ingestedAt: string
}

export interface StoreState {
  records: number
  sentinel: IngestSummary | null
}

export interface VectorStore {
  readonly namespace: string
  ensureIndex(dimension: number): Promise<void>
  /** Record count and ingestion sentinel of the namespace. */
  state(): Promise<StoreState>
  upsert(records: readonly ChunkRecord[]): Promise<void>
  writeSentinel(summary: IngestSummary, dimension: number): Promise<void>
  /** Deletes every record in the namespace and waits until the deletion is visible. */
  reset(): Promise<void>
}

export const hasData = (state: StoreState) => state.records > 0 || state.sentinel !== null

export interface PineconeStoreOptions {
  apiKey: string
  index: string
  namespace: string
  cloud?: 'aws' | 'gcp' | 'azure'
  region?: string
  /** How long `reset` waits for the deletion to become visible. */
  resetTimeoutMs?: number
}

const isNotFound = (error: unknown) =>
  error instanceof Error && (error.name === 'PineconeNotFoundError' || /\b404\b|not found/i.test(error.message))

export function createPineconeStore(options: PineconeStoreOptions): VectorStore {
  const { apiKey, index: indexName, namespace, cloud = 'aws', region = 'us-east-1', resetTimeoutMs = 60_000 } = options
  const pc = new Pinecone({ apiKey })
  const ns = () => pc.index(indexName).namespace(namespace)

  const state = async (): Promise<StoreState> => {
    const [fetched, stats] = await Promise.all([
      ns().fetch({ ids: [SENTINEL_ID] }),
      pc.index(indexName).describeIndexStats(),
    ])
    const sentinel = fetched.records?.[SENTINEL_ID]?.metadata
    const count = stats.namespaces?.[namespace]?.recordCount ?? 0
    return {
      records: sentinel ? Math.max(0, count - 1) : count,
      sentinel: sentinel
        ? {
            documents: Number(sentinel.documents),
            chunks: Number(sentinel.chunks),
            ingestedAt: String(sentinel.ingested_at),
          }
        : null,
    }
  }

  return {
    namespace,
    state,

    async ensureIndex(dimension) {
      const { indexes = [] } = await pc.listIndexes()
      const existing = indexes.find(i => i.name === indexName)
      if (!existing) {
        await pc.createIndex({
          name: indexName,
          dimension,
          metric: 'cosine',
          spec: { serverless: { cloud, region } },
          waitUntilReady: true,
        })
        return
      }
      if (existing.dimension !== dimension) {
        throw new Error(`Index "${indexName}" has ${existing.dimension} dimensions; the embedder produces ${dimension}`)
      }
    },

    async upsert(records) {
      if (records.length === 0) return
      // ChunkMetadata only holds Pinecone-compatible values; `heading` is omitted rather than undefined.
      await ns().upsert({ records: records.map(r => ({ ...r, metadata: r.metadata as unknown as RecordMetadata })) })
    },

    async writeSentinel(summary, dimension) {
      const values = Array.from({ length: dimension }, (_, i) => (i === 0 ? 1 : 0))
      await ns().upsert({
        records: [
          {
            id: SENTINEL_ID,
            values,
            metadata: {
              kind: 'ingest',
              completed: true,
              documents: summary.documents,
              chunks: summary.chunks,
              ingested_at: summary.ingestedAt,
            },
          },
        ],
      })
    },

    async reset() {
      try {
        await pc.index(indexName).deleteNamespace(namespace)
      } catch (error) {
        if (!isNotFound(error)) throw error
      }
      const deadline = Date.now() + resetTimeoutMs
      while (hasData(await state())) {
        if (Date.now() > deadline) throw new Error(`Namespace "${namespace}" still reports data after reset`)
        await Bun.sleep(1000)
      }
    },
  }
}
