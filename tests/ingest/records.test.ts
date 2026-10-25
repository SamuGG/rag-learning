import { describe, expect, test } from 'bun:test'
import {
  batchRecords,
  MAX_METADATA_BYTES,
  RecordTooLargeError,
  sanitiseLabel,
  toRecord,
} from '../../src/ingest/records'
import type { Scene } from '../../src/ingest/types'

const scene = (overrides: Partial<Scene> = {}): Scene => ({
  imdbId: 'tt0000001',
  sceneIndex: 3,
  chunkIndex: 1,
  heading: 'INT. HUT - DAY',
  text: 'INT. HUT - DAY\n\nRain.\n',
  ...overrides,
})

describe('toRecord', () => {
  test('builds the id and metadata, keeping the text exact', () => {
    const record = toRecord(scene(), 'Frozen Canyon', [0.1, 0.2])
    expect(record.id).toBe('tt0000001:3:1')
    expect(record.metadata).toEqual({
      kind: 'chunk',
      imdb_id: 'tt0000001',
      title: 'Frozen Canyon',
      scene_index: 3,
      chunk_index: 1,
      heading: 'INT. HUT - DAY',
      text: 'INT. HUT - DAY\n\nRain.\n',
    })
  })

  test('omits a null heading', () => {
    expect('heading' in toRecord(scene({ heading: null }), 'T', []).metadata).toBe(false)
  })

  test('sanitises labels but not the chunk text', () => {
    expect(sanitiseLabel('  Bad\u0007Title\n')).toBe('Bad Title')
    expect(sanitiseLabel('x'.repeat(400))).toHaveLength(300)
    expect(toRecord(scene({ text: 'a\u0007b' }), 'T', []).metadata.text).toBe('a\u0007b')
  })

  test('rejects metadata above the size limit', () => {
    expect(() => toRecord(scene({ text: 'x'.repeat(MAX_METADATA_BYTES) }), 'T', [])).toThrow(RecordTooLargeError)
  })
})

describe('batchRecords', () => {
  test('respects the record-count limit', () => {
    expect(batchRecords(Array.from({ length: 2500 }, (_, i) => ({ i }))).map(b => b.length)).toEqual([1000, 1000, 500])
  })

  test('respects the byte limit', () => {
    const records = Array.from({ length: 5 }, () => ({ text: 'x'.repeat(90) }))
    expect(batchRecords(records, 1000, 250).map(b => b.length)).toEqual([2, 2, 1])
  })

  test('keeps an oversized single record in its own batch', () => {
    expect(batchRecords([{ text: 'x'.repeat(500) }, { text: 'y' }], 1000, 100).map(b => b.length)).toEqual([1, 1])
  })
})
