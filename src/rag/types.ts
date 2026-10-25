/** A stored chunk returned by similarity search. */
export interface RetrievedChunk {
  id: string
  score: number
  imdbId: string
  title: string
  sceneIndex: number
  chunkIndex: number
  heading: string | null
  text: string
}

export interface Turn {
  role: 'user' | 'assistant'
  content: string
}
