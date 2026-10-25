export interface PackOptions {
  /** Target chunk size in tokens, overlap included. */
  target: number
  overlapMin: number
  overlapMax: number
  /** Largest chunk the embedder reads in full (bounds the tail merge). */
  embedBudget: number
}

/** Inclusive range of block indices forming one chunk. */
export interface ChunkRange {
  firstBlock: number
  lastBlock: number
}

const sum = (tokens: readonly number[], from: number, to: number) => {
  let total = 0
  for (let i = from; i <= to; i++) total += tokens[i] ?? 0
  return total
}

/**
 * Greedily packs whole blocks into chunks of about `target` tokens. Each chunk after the first starts with
 * the largest suffix of whole blocks from the previous chunk that fits in `overlapMax` tokens.
 */
export function packBlocks(tokens: readonly number[], options: PackOptions): ChunkRange[] {
  const { target, overlapMin, overlapMax, embedBudget } = options
  const n = tokens.length
  if (n === 0) return []
  if (sum(tokens, 0, n - 1) <= target) return [{ firstBlock: 0, lastBlock: n - 1 }]

  const t = (i: number) => tokens[i] ?? 0
  const chunks: ChunkRange[] = []
  let next = 0
  let overlapStart: number | null = null

  while (next < n) {
    let first = overlapStart ?? next
    let current = sum(tokens, first, next - 1)
    // Shrink the overlap from the front so a large next block still fits the target.
    while (first < next && current + t(next) > target) {
      current -= t(first)
      first++
    }
    current += t(next)
    let last = next
    next++
    while (next < n && current + t(next) <= target) {
      current += t(next)
      last = next
      next++
    }
    chunks.push({ firstBlock: first, lastBlock: last })

    let k = last
    let overlap = 0
    while (k > first && overlap + t(k) <= overlapMax) {
      overlap += t(k)
      k--
    }
    overlapStart = k < last ? k + 1 : null
  }

  // Merge a tail chunk that adds little new text into its predecessor, if the result still embeds fully.
  const tail = chunks.at(-1)
  const previous = chunks.at(-2)
  if (tail && previous) {
    const newTokens = sum(tokens, previous.lastBlock + 1, tail.lastBlock)
    if (newTokens < overlapMin && sum(tokens, previous.firstBlock, tail.lastBlock) <= embedBudget) {
      chunks.splice(-2, 2, { firstBlock: previous.firstBlock, lastBlock: tail.lastBlock })
    }
  }
  return chunks
}
