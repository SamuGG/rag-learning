// Test doubles for services that need a model download or a network.
import type { Embedder } from '../../src/server/embedder'

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
