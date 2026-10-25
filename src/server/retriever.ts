import { Pinecone } from '@pinecone-database/pinecone'
import type { RetrievedChunk } from '../rag/types'

export interface Retriever {
  retrieve(vector: number[], topK: number): Promise<RetrievedChunk[]>
}

/** Similarity search over chunk records only; the ingestion sentinel is filtered out. */
export function createPineconeRetriever(options: { apiKey: string; index: string; namespace: string }): Retriever {
  const ns = new Pinecone({ apiKey: options.apiKey }).index(options.index).namespace(options.namespace)
  return {
    async retrieve(vector, topK) {
      const { matches = [] } = await ns.query({
        vector,
        topK,
        includeMetadata: true,
        filter: { kind: { $eq: 'chunk' } },
      })
      return matches.flatMap(match => {
        const m = match.metadata
        if (!m) return []
        return [
          {
            id: match.id,
            score: match.score ?? 0,
            imdbId: String(m.imdb_id),
            title: String(m.title),
            sceneIndex: Number(m.scene_index),
            chunkIndex: Number(m.chunk_index),
            heading: typeof m.heading === 'string' ? m.heading : null,
            text: String(m.text),
          },
        ]
      })
    },
  }
}
