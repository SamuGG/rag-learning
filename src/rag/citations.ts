import { chunkLabel } from './prompts'
import type { RetrievedChunk } from './types'

/** Numbered citations such as `[1]`, `[1][3]` or `[1, 3]`, in order of first appearance, without duplicates. */
export function findCitations(answer: string): number[] {
  const numbers: number[] = []
  for (const [, group = ''] of answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    for (const part of group.split(',')) {
      const n = Number(part.trim())
      if (!numbers.includes(n)) numbers.push(n)
    }
  }
  return numbers
}

/** Cited numbers that refer to no excerpt (excerpts are numbered from 1). */
export function unmatchedCitations(answer: string, excerptCount: number): number[] {
  return findCitations(answer).filter(n => n < 1 || n > excerptCount)
}

/**
 * Replaces numbered citations with `(Title — HEADING)`. Used for the conversation history, because the next
 * question numbers its excerpts afresh and old numbers would point at the wrong scenes.
 */
export function resolveCitations(answer: string, chunks: readonly RetrievedChunk[]): string {
  return answer.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (marker, group: string) => {
    const labels = group.split(',').map(part => chunks[Number(part.trim()) - 1])
    if (labels.some(chunk => !chunk)) return marker
    return `(${labels.map(chunk => chunkLabel(chunk as RetrievedChunk)).join('; ')})`
  })
}
