import { EmbeddingModel, FlagEmbedding } from 'fastembed'

export interface Embedder {
  readonly dimension: number
  /** Instruction the model expects before short search queries (empty when it has none). */
  readonly queryInstruction: string
  embed(texts: readonly string[]): Promise<number[][]>
}

/** Supported fastembed models and their vector sizes. */
const DIMENSIONS: Partial<Record<EmbeddingModel, number>> = {
  [EmbeddingModel.BGESmallENV15]: 384,
}

/** BGE models retrieve better when short queries carry this instruction; passages are embedded as is. */
const QUERY_INSTRUCTIONS: Partial<Record<EmbeddingModel, string>> = {
  [EmbeddingModel.BGESmallENV15]: 'Represent this sentence for searching relevant passages: ',
}

const BATCH_SIZE = 64

export function isSupportedModel(model: string): model is EmbeddingModel.BGESmallENV15 {
  return DIMENSIONS[model as EmbeddingModel] !== undefined
}

/**
 * Local embeddings with fastembed. Uses plain `embed()`: `passageEmbed`/`queryEmbed` add E5-style
 * prefixes that BGE models were not trained with.
 */
export async function createFastembedEmbedder(options: { model: string; cacheDir: string }): Promise<Embedder> {
  const { model, cacheDir } = options
  if (!isSupportedModel(model)) {
    const supported = Object.keys(DIMENSIONS).join(', ')
    throw new Error(`Unsupported EMBEDDING_MODEL "${model}" (supported: ${supported})`)
  }
  const dimension = DIMENSIONS[model] as number
  const flag = await FlagEmbedding.init({ model, cacheDir, showDownloadProgress: false })
  return {
    dimension,
    queryInstruction: QUERY_INSTRUCTIONS[model] ?? '',
    async embed(texts) {
      const vectors: number[][] = []
      for await (const batch of flag.embed([...texts], BATCH_SIZE)) vectors.push(...batch)
      return vectors
    },
  }
}
