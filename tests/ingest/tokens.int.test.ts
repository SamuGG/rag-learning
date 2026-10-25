import { expect, test } from 'bun:test'
import { EmbeddingModel } from 'fastembed'
import { segmentBlocks } from '../../src/ingest/blocks'
import { splitScreenplay } from '../../src/ingest/chunker'
import { segmentScenes } from '../../src/ingest/scenes'
import { createModelCounter, tokenizerPath } from '../../src/ingest/tokens'
import { longScene } from './fixtures'

const cacheDir = process.env.EMBEDDING_CACHE_DIR ?? '.cache/fastembed'
const cached = await Bun.file(tokenizerPath(cacheDir, EmbeddingModel.BGESmallENV15) ?? '').exists()

// Runs only where the embedding model is cached (never downloads in CI).
test.skipIf(!cached)('block token counts add up to the chunk count with the real tokenizer', async () => {
  const counter = await createModelCounter(cacheDir)
  const source = longScene(40)
  const [segment] = segmentScenes(source)
  if (!segment) throw new Error('no segment')
  const blocks = segmentBlocks(segment).map(b => source.slice(b.start, b.end))
  const perBlock = await counter.countMany(blocks)
  const [whole] = await counter.countMany([blocks.join('')])
  expect(perBlock.reduce((a, b) => a + b, 0)).toBe(whole ?? -1)

  const scenes = await splitScreenplay('tt0000001', source, { counter })
  const sizes = await counter.countMany(scenes.map(s => s.text))
  for (const size of sizes.slice(0, -1)) expect(size).toBeLessThanOrEqual(450)
})

test.skipIf(!cached)('counts are not capped at the 512-token model window', async () => {
  const counter = await createModelCounter(cacheDir)
  const [count] = await counter.countMany(['word '.repeat(900)])
  expect(count).toBe(900)
})
