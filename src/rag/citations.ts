import { chunkLabel } from './prompts'
import type { RetrievedChunk } from './types'

const CITATION = /\[[^[\]]+ — [^[\]]+\]/g

/** Citation labels such as `[Title — INT. HOUSE - DAY]` found in an answer, in order, without duplicates. */
export function findCitations(answer: string): string[] {
  return [...new Set(answer.match(CITATION) ?? [])]
}

/** Citations that do not exactly match the label of any retrieved chunk. */
export function unmatchedCitations(answer: string, chunks: readonly RetrievedChunk[]): string[] {
  const labels = new Set(chunks.map(chunkLabel))
  return findCitations(answer).filter(citation => !labels.has(citation))
}
