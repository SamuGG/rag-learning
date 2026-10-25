'use server'

// Spike (#6): proves server functions run on Bun and can use native addons and the Pinecone SDK.

export interface SpikeStatus {
  runtime: string
  envKeyPresent: boolean
  readmeBytes: number
  embeddingDims?: number
  pineconeIndexReady?: boolean
  error?: string
}

export async function getSpikeStatus(deep: boolean): Promise<SpikeStatus> {
  const status: SpikeStatus = {
    runtime: `bun ${Bun.version}`,
    envKeyPresent: Boolean(Bun.env.PINECONE_API_KEY),
    readmeBytes: Bun.file('README.md').size,
  }
  if (!deep) return status
  try {
    const { EmbeddingModel, FlagEmbedding } = await import('fastembed')
    const model = await FlagEmbedding.init({
      model: EmbeddingModel.BGESmallENV15,
      cacheDir: Bun.env.EMBEDDING_CACHE_DIR ?? '.cache/fastembed',
      showDownloadProgress: false,
    })
    for await (const batch of model.embed(['spike'])) status.embeddingDims = batch[0]?.length
    const { Pinecone } = await import('@pinecone-database/pinecone')
    const index = await new Pinecone().describeIndex(Bun.env.PINECONE_INDEX ?? 'rag-screenplays')
    status.pineconeIndexReady = index.status?.ready
  } catch (error) {
    status.error = error instanceof Error ? error.message : String(error)
  }
  return status
}
