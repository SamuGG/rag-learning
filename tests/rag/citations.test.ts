import { expect, test } from 'bun:test'
import { findCitations, unmatchedCitations } from '../../src/rag/citations'
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

test('finds each citation once, in order', () => {
  expect(findCitations('A [X — Y] then [Z — W] and [X — Y] again, not [plain].')).toEqual(['[X — Y]', '[Z — W]'])
  expect(findCitations('No citations here.')).toEqual([])
})

test('accepts exact labels, including scene-number labels', () => {
  const answer = 'Fixing [Frozen Canyon (synthetic sample) — EXT. FROZEN CANYON - TWILIGHT]; alarm [Outpost — scene 3].'
  expect(unmatchedCitations(answer, chunks)).toEqual([])
})

test('flags a shortened title', () => {
  expect(unmatchedCitations('Fixing [Frozen Canyon — EXT. FROZEN CANYON - TWILIGHT].', chunks)).toEqual([
    '[Frozen Canyon — EXT. FROZEN CANYON - TWILIGHT]',
  ])
})
