import { segmentBlocks } from './blocks'
import { DEFAULT_RULES, type HeadingRule } from './headings'
import { packBlocks } from './pack'
import { segmentScenes } from './scenes'
import type { Scene, SplitWarning, TokenCounter } from './types'

export interface SplitOptions {
  counter: TokenCounter
  /** Target chunk size in tokens, overlap included. Default 450. */
  targetTokens?: number
  /** Default 50. */
  overlapMinTokens?: number
  /** Default 100. */
  overlapMaxTokens?: number
  /** Tokens the embedder reads, excluding [CLS]/[SEP]. Default 510. */
  maxEmbedTokens?: number
  /** Text prepended to each chunk before embedding; its tokens reduce the embedding budget. */
  prefix?: (heading: string | null) => string
  rules?: readonly HeadingRule[]
  onWarning?: (warning: SplitWarning) => void
}

/** Files above this many tokens without a single scene heading trigger a `no-headings` warning. */
const NO_HEADINGS_THRESHOLD = 200

/** Splits a screenplay into scene chunks whose text is always an exact slice of `source`. */
export async function splitScreenplay(imdbId: string, source: string, options: SplitOptions): Promise<Scene[]> {
  const {
    counter,
    targetTokens = 450,
    overlapMinTokens = 50,
    overlapMaxTokens = 100,
    maxEmbedTokens = 510,
    prefix,
    rules = DEFAULT_RULES,
    onWarning,
  } = options

  const scenes: Scene[] = []
  let totalTokens = 0
  const segments = segmentScenes(source, rules)

  for (const [sceneIndex, segment] of segments.entries()) {
    const blocks = segmentBlocks(segment, rules)
    const tokens = await counter.countMany(blocks.map(block => source.slice(block.start, block.end)))
    const [prefixTokens = 0] = prefix ? await counter.countMany([prefix(segment.heading)]) : []
    const embedBudget = maxEmbedTokens - prefixTokens
    const ranges = packBlocks(tokens, {
      target: targetTokens,
      overlapMin: overlapMinTokens,
      overlapMax: overlapMaxTokens,
      embedBudget,
    })

    for (const [chunkIndex, range] of ranges.entries()) {
      let chunkTokens = 0
      for (let i = range.firstBlock; i <= range.lastBlock; i++) chunkTokens += tokens[i] ?? 0
      if (range.firstBlock === range.lastBlock && chunkTokens > targetTokens) {
        onWarning?.({ type: 'oversized-block', sceneIndex, chunkIndex, tokens: chunkTokens })
      }
      if (chunkTokens > embedBudget) {
        onWarning?.({ type: 'truncation', sceneIndex, chunkIndex, tokens: chunkTokens, budget: embedBudget })
      }
      const first = blocks[range.firstBlock]
      const last = blocks[range.lastBlock]
      if (!first || !last) continue
      scenes.push({
        imdbId,
        sceneIndex,
        chunkIndex,
        heading: segment.heading,
        text: source.slice(first.start, last.end),
      })
    }
    totalTokens += tokens.reduce((a, b) => a + b, 0)
  }

  if (totalTokens > NO_HEADINGS_THRESHOLD && !segments.some(segment => segment.kind === 'scene')) {
    onWarning?.({ type: 'no-headings', tokens: totalTokens })
  }
  return scenes
}
