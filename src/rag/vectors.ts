/** Element-wise mean of unit vectors, re-normalised to unit length. */
export function blendVectors(vectors: readonly number[][]): number[] {
  const [first] = vectors
  if (!first) throw new Error('blendVectors needs at least one vector')
  const sum = new Array<number>(first.length).fill(0)
  for (const vector of vectors) {
    if (vector.length !== first.length) throw new Error('blendVectors needs vectors of the same dimension')
    for (let i = 0; i < vector.length; i++) sum[i] = (sum[i] ?? 0) + (vector[i] ?? 0)
  }
  const norm = Math.hypot(...sum)
  return norm === 0 ? sum : sum.map(value => value / norm)
}
