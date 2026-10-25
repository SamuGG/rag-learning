/**
 * Text prepended to every chunk before embedding, so retrieval sees which film and scene it comes from.
 * The chunker counts it against the embedding budget; the embedder prepends exactly the same text.
 */
export function embeddingPrefix(title: string): (heading: string | null) => string {
  return heading => `${title}\n${heading ?? ''}\n\n`
}
