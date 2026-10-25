import { describe, expect, test } from 'bun:test'
import { approximateCounter } from '../../src/ingest/tokens'
import { loadDocuments } from '../../src/server/documents'
import { ingestAll, StoreNotEmptyError } from '../../src/server/ingest'
import { SENTINEL_ID } from '../../src/server/store'
import { fakeEmbedder, memoryStore } from './fakes'

const documents = await loadDocuments('data/samples')

describe('ingestAll', () => {
  test('stores every chunk, then writes the sentinel last', async () => {
    const store = memoryStore()
    const embedder = fakeEmbedder()
    const result = await ingestAll({ documents, embedder, store, counter: approximateCounter })

    expect(result).toMatchObject({ documents: 2, chunks: 2 })
    expect([...store.records.keys()]).toEqual(['tt0000001:0:0', 'tt0000002:0:0'])
    expect(store.writes.at(-1)).toBe(SENTINEL_ID)
    expect(store.records.get('tt0000001:0:0')?.metadata.text).toBe(documents[0]?.source ?? '')
    expect(embedder.inputs[0]?.startsWith('Frozen Canyon (synthetic sample)\nEXT. FROZEN CANYON - TWILIGHT\n\n')).toBe(
      true,
    )
  })

  test('refuses a namespace that already holds data', async () => {
    const store = memoryStore()
    await ingestAll({ documents, embedder: fakeEmbedder(), store, counter: approximateCounter })
    await expect(
      ingestAll({ documents, embedder: fakeEmbedder(), store, counter: approximateCounter }),
    ).rejects.toThrow(StoreNotEmptyError)
  })

  test('refuses a partial ingestion without a sentinel', async () => {
    const store = memoryStore()
    await store.upsert([
      {
        id: 'x',
        values: [],
        metadata: { kind: 'chunk', imdb_id: 'tt0000009', title: 'X', scene_index: 0, chunk_index: 0, text: 'x' },
      },
    ])
    await expect(
      ingestAll({ documents, embedder: fakeEmbedder(), store, counter: approximateCounter }),
    ).rejects.toThrow('incomplete ingestion')
  })
})
