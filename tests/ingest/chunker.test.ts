import { describe, expect, test } from 'bun:test'
import { segmentBlocks } from '../../src/ingest/blocks'
import { splitScreenplay } from '../../src/ingest/chunker'
import { packBlocks } from '../../src/ingest/pack'
import { segmentScenes } from '../../src/ingest/scenes'
import { approximateCounter } from '../../src/ingest/tokens'
import type { SplitWarning } from '../../src/ingest/types'
import { longScene } from './fixtures'

const split = (source: string, warnings: SplitWarning[] = []) =>
  splitScreenplay('tt0000001', source, { counter: approximateCounter, onWarning: w => warnings.push(w) })

const sample = (name: string) => Bun.file(`data/samples/${name}`).text()

/** Segments must join back to the source, and blocks back to their segment. */
const expectPartition = (source: string) => {
  const segments = segmentScenes(source)
  expect(segments.map(s => source.slice(s.start, s.end)).join('')).toBe(source.replace(/^﻿/, ''))
  for (const segment of segments) {
    const blocks = segmentBlocks(segment)
    expect(blocks[0]?.start).toBe(segment.start)
    expect(blocks.at(-1)?.end).toBe(segment.end)
    for (const [i, block] of blocks.entries()) if (i > 0) expect(block.start).toBe(blocks[i - 1]?.end ?? -1)
  }
  return segments
}

describe('samples', () => {
  test.each([
    ['frozen-canyon.txt', 'EXT. FROZEN CANYON - TWILIGHT'],
    ['asteroid-outpost.txt', 'EXT. ASTEROID MINING OUTPOST - DAY'],
  ])('%p is one scene and one chunk with the exact text', async (file, heading) => {
    const source = await sample(file)
    expectPartition(source)
    const scenes = await split(source)
    expect(scenes).toHaveLength(1)
    expect(scenes[0]).toEqual({ imdbId: 'tt0000001', sceneIndex: 0, chunkIndex: 0, heading, text: source })
  })

  test('glues cues to their speech across blank lines', async () => {
    const source = await sample('frozen-canyon.txt')
    const [segment] = segmentScenes(source)
    if (!segment) throw new Error('no segment')
    const blocks = segmentBlocks(segment)
    expect(blocks.map(b => b.kind)).toEqual(['heading', 'action', 'dialogue', 'dialogue'])
    expect(source.slice(blocks[2]?.start, blocks[2]?.end)).toBe(
      "YOUNG PILOT\n\nTell me that's the last broken part.\n\n",
    )
  })
})

describe('scene structure', () => {
  const kindsAndHeadings = (source: string) =>
    expectPartition(source).map(s => [s.kind, s.heading, source.slice(s.start, s.end)])

  test('FADE IN merges forward and a final THE END merges backward', () => {
    const source = 'FADE IN:\n\nINT. HUT - DAY\n\nRain.\n\nTHE END\n'
    expect(kindsAndHeadings(source)).toEqual([['scene', 'INT. HUT - DAY', source]])
  })

  test('a bodiless scene heading stays its own scene', () => {
    const source = 'INT. HALL - DAY\n\nEXT. GARDEN - DAY\n\nBirds sing.\n'
    expect(kindsAndHeadings(source).map(([kind, heading]) => [kind, heading])).toEqual([
      ['scene', 'INT. HALL - DAY'],
      ['scene', 'EXT. GARDEN - DAY'],
    ])
  })

  test('text after a closing transition becomes an orphan segment', () => {
    const source = 'INT. HUT - DAY\n\nRain.\n\nCUT TO:\n\nA truck speeds away.\n\nINT. CAB - DAY\n\nSilence.\n'
    expect(kindsAndHeadings(source).map(([kind, heading]) => [kind, heading])).toEqual([
      ['scene', 'INT. HUT - DAY'],
      ['orphan', null],
      ['scene', 'INT. CAB - DAY'],
    ])
  })

  test('page furniture after a transition does not create a segment', () => {
    const source = 'INT. HUT - DAY\n\nRain.\n\nCUT TO:\n\n45.\n\nINT. CAB - DAY\n\nSilence.\n'
    expect(kindsAndHeadings(source).map(([kind]) => kind)).toEqual(['scene', 'scene'])
  })

  test('the preamble is kept as its own segment', () => {
    const source = 'RELAY\n\nWritten by Nobody\n\nINT. HUT - DAY\n\nRain.\n'
    expect(kindsAndHeadings(source).map(([kind, heading]) => [kind, heading])).toEqual([
      ['preamble', null],
      ['scene', 'INT. HUT - DAY'],
    ])
  })

  test('CRLF, form feeds, indentation and a BOM partition exactly', async () => {
    const source = '﻿  INT. HUT - DAY\r\n\r\n\fRain falls.\r\n\r\n          MARA\r\n     Look out!\r\n'
    expectPartition(source)
    const scenes = await split(source)
    expect(scenes.map(s => s.text).join('')).toBe(source.slice(1))
  })

  test('cue lines split paragraphs in exports without blank lines', () => {
    const source = 'INT. HUT - DAY\nRain falls.\nMARA\nLook out!\nTEO\n(whispering)\nToo late.\n'
    const [segment] = segmentScenes(source)
    if (!segment) throw new Error('no segment')
    expect(segmentBlocks(segment).map(b => b.kind)).toEqual(['heading', 'action', 'dialogue', 'dialogue'])
  })
})

describe('chunking long scenes', () => {
  test('chunks respect the target, overlap with whole blocks and rebuild the scene', async () => {
    const source = longScene(60)
    const [segment] = segmentScenes(source)
    if (!segment) throw new Error('no segment')
    const blocks = segmentBlocks(segment)
    const tokens = await approximateCounter.countMany(blocks.map(b => source.slice(b.start, b.end)))
    const ranges = packBlocks(tokens, { target: 450, overlapMin: 50, overlapMax: 100, embedBudget: 510 })
    expect(ranges.length).toBeGreaterThan(2)

    const sum = (from: number, to: number) => tokens.slice(from, to + 1).reduce((a, b) => a + b, 0)
    let rebuilt = ''
    for (const [i, range] of ranges.entries()) {
      const isTail = i === ranges.length - 1
      expect(sum(range.firstBlock, range.lastBlock)).toBeLessThanOrEqual(isTail ? 510 : 450)
      const previous = ranges[i - 1]
      const newFrom = previous ? previous.lastBlock + 1 : range.firstBlock
      if (previous) {
        expect(range.firstBlock).toBeGreaterThan(previous.firstBlock)
        expect(range.firstBlock).toBeLessThanOrEqual(newFrom)
        expect(sum(range.firstBlock, newFrom - 1)).toBeLessThanOrEqual(100)
      }
      rebuilt += source.slice(blocks[newFrom]?.start, blocks[range.lastBlock]?.end)
    }
    expect(rebuilt).toBe(source)

    const scenes = await split(source)
    expect(scenes).toHaveLength(ranges.length)
    for (const scene of scenes) expect(source.includes(scene.text)).toBe(true)
  })

  test('an oversized speech stays intact and triggers a warning', async () => {
    const source = longScene(12, { longSpeechAt: 5, longSpeechWords: 600 })
    const warnings: SplitWarning[] = []
    const scenes = await split(source, warnings)
    expect(scenes.some(s => s.text.includes('word49 word0') && s.text.trimEnd().endsWith('.'))).toBe(true)
    expect(warnings.some(w => w.type === 'oversized-block')).toBe(true)
    expect(warnings.some(w => w.type === 'truncation')).toBe(true)
  })

  test('a tiny tail merges into the previous chunk within the embedding budget', () => {
    const ranges = packBlocks([200, 200, 40, 20], { target: 450, overlapMin: 50, overlapMax: 100, embedBudget: 510 })
    expect(ranges).toEqual([{ firstBlock: 0, lastBlock: 3 }])
  })

  test('no overlap when the last block exceeds the overlap maximum', () => {
    const ranges = packBlocks([300, 140, 300], { target: 450, overlapMin: 50, overlapMax: 100, embedBudget: 510 })
    expect(ranges).toEqual([
      { firstBlock: 0, lastBlock: 1 },
      { firstBlock: 2, lastBlock: 2 },
    ])
  })
})

test('a file without headings warns and is still chunked', async () => {
  const warnings: SplitWarning[] = []
  const source = 'Just some notes about a story. '.repeat(40)
  const scenes = await split(source, warnings)
  expect(scenes.map(s => s.text).join('')).toBe(source)
  expect(warnings.map(w => w.type)).toContain('no-headings')
})
