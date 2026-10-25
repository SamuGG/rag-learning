import { join } from 'node:path'
import { Tokenizer } from '@anush008/tokenizers'
import { EmbeddingModel, FlagEmbedding } from 'fastembed'
import type { TokenCounter } from './types'

/** Deterministic stand-in for tests: one token per word or punctuation mark. */
export const approximateCounter: TokenCounter = {
  countMany: async texts => texts.map(text => text.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu)?.length ?? 0),
}

/** Folder names fastembed uses inside its cache for each supported model. */
const MODEL_DIRS: Partial<Record<EmbeddingModel, string>> = {
  [EmbeddingModel.BGESmallENV15]: 'Qdrant_bge-small-en-v1.5-onnx-Q',
}

/** Path of the cached `tokenizer.json` for a model, or undefined if the model id is unsupported. */
export function tokenizerPath(cacheDir: string, model: EmbeddingModel): string | undefined {
  const dir = MODEL_DIRS[model]
  return dir ? join(cacheDir, dir, 'tokenizer.json') : undefined
}

/**
 * Counts tokens with the embedding model's own tokenizer, without special tokens, truncation or padding.
 * Downloads the model on first use.
 */
export async function createModelCounter(
  cacheDir: string,
  model: EmbeddingModel = EmbeddingModel.BGESmallENV15,
): Promise<TokenCounter> {
  const path = tokenizerPath(cacheDir, model)
  if (!path) throw new Error(`No tokenizer mapping for embedding model "${model}"`)
  if (!(await Bun.file(path).exists())) {
    await FlagEmbedding.init({ model: model as EmbeddingModel.BGESmallENV15, cacheDir, showDownloadProgress: false })
  }
  const tokenizer = Tokenizer.fromFile(path)
  tokenizer.disableTruncation()
  tokenizer.disablePadding()
  return {
    countMany: texts =>
      Promise.all(
        texts.map(async text => (await tokenizer.encode(text, null, { addSpecialTokens: false })).getIds().length),
      ),
  }
}
