import { expect, test } from 'bun:test'
import { embeddingPrefix } from '../../src/ingest/prefix'
import { createFastembedEmbedder, isSupportedModel } from '../../src/server/embedder'
import { fakeEmbedder } from './fakes'

test('the embedding prefix carries title and heading', () => {
  const prefix = embeddingPrefix('Frozen Canyon (synthetic sample)')
  expect(prefix('EXT. FROZEN CANYON - TWILIGHT')).toBe(
    'Frozen Canyon (synthetic sample)\nEXT. FROZEN CANYON - TWILIGHT\n\n',
  )
  expect(prefix(null)).toBe('Frozen Canyon (synthetic sample)\n\n\n')
})

test('only supported models are accepted', async () => {
  expect(isSupportedModel('fast-bge-small-en-v1.5')).toBe(true)
  expect(isSupportedModel('BAAI/bge-small-en-v1.5')).toBe(false)
  await expect(createFastembedEmbedder({ model: 'BAAI/bge-small-en-v1.5', cacheDir: '.cache' })).rejects.toThrow(
    'Unsupported EMBEDDING_MODEL',
  )
})

test('the fake embedder is deterministic and normalised', async () => {
  const embedder = fakeEmbedder()
  const [a, b] = await embedder.embed(['same', 'same'])
  expect(a).toEqual(b ?? [])
  expect(Math.hypot(...(a ?? []))).toBeCloseTo(1, 6)
})
