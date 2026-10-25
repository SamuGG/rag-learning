import { expect, test } from 'bun:test'
import { findCitations, resolveCitations, unmatchedCitations } from '../../src/rag/citations'
import type { RetrievedChunk } from '../../src/rag/types'

const chunks: RetrievedChunk[] = [
  {
    id: 'tt0000001:0:0',
    score: 0.5,
    imdbId: 'tt0000001',
    title: 'Frozen Canyon (synthetic sample)',
    sceneIndex: 0,
    chunkIndex: 0,
    heading: 'EXT. FROZEN CANYON - TWILIGHT',
    text: '',
  },
  {
    id: 'tt0000002:2:0',
    score: 0.4,
    imdbId: 'tt0000002',
    title: 'Outpost',
    sceneIndex: 2,
    chunkIndex: 0,
    heading: null,
    text: '',
  },
]

test('finds numbered citations in order, without duplicates', () => {
  expect(findCitations('The droid [2] fixes it [1][2], see also [1, 3].')).toEqual([2, 1, 3])
  expect(findCitations('No citations, not even [Title — HEADING].')).toEqual([])
})

test('flags numbers that match no excerpt', () => {
  expect(unmatchedCitations('Fine [1][2].', 2)).toEqual([])
  expect(unmatchedCitations('Invented [3] and [0].', 2)).toEqual([3, 0])
})

test('resolves numbers to labels for the history', () => {
  expect(resolveCitations('The droid repairs it [1]; an alarm sounds [1, 2]. Odd [7].', chunks)).toBe(
    'The droid repairs it (Frozen Canyon (synthetic sample) — EXT. FROZEN CANYON - TWILIGHT); an alarm sounds '
      + '(Frozen Canyon (synthetic sample) — EXT. FROZEN CANYON - TWILIGHT; Outpost — scene 3). Odd [7].',
  )
})
