/** One retrievable piece of a screenplay scene. A short scene yields exactly one. */
export interface Scene {
  imdbId: string
  /** 0-based order of the scene (segment) in the screenplay. */
  sceneIndex: number
  /** 0-based order of the chunk within its scene. */
  chunkIndex: number
  /** The scene heading line, trimmed; null for preamble, orphan and transition-opened segments. */
  heading: string | null
  /** Exact slice of the source text, including any overlap with the previous chunk. */
  text: string
}

/** Counts tokens the way the embedding model will. */
export interface TokenCounter {
  countMany(texts: readonly string[]): Promise<number[]>
}

export type SplitWarning =
  | { type: 'oversized-block'; sceneIndex: number; chunkIndex: number; tokens: number }
  | { type: 'truncation'; sceneIndex: number; chunkIndex: number; tokens: number; budget: number }
  | { type: 'no-headings'; tokens: number }
