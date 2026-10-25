// Stand-ins for Ollama, Fastembed and Pinecone, used when FAKE_SERVICES=true (end-to-end tests, offline demos).
import { splitScreenplay } from '../ingest/chunker'
import { approximateCounter } from '../ingest/tokens'
import type { RetrievedChunk } from '../rag/types'
import { loadDocuments } from './documents'
import type { Embedder } from './embedder'
import { type ChatModel, ChatModelError } from './llm'
import type { Retriever } from './retriever'

/** Questions containing this phrase make the fake model fail, to exercise error handling. */
export const FAKE_ERROR_TRIGGER = 'simulate an error'
const FAKE_ANSWER =
  'An **old droid** repairs the frozen engine while a young pilot hopes it is the last broken part [1].'

export function fakeChatModel(): ChatModel {
  return {
    name: 'fake',
    async generate() {
      return { content: 'EXT. FROZEN CANYON - NIGHT\n\nA pilot and an old droid repair an engine.' }
    },
    async *stream(messages, options) {
      if (messages.at(-1)?.content.includes(FAKE_ERROR_TRIGGER)) {
        throw new ChatModelError('Fake model failure (requested by the question).')
      }
      for (const word of FAKE_ANSWER.split(/(?<= )/)) {
        if (options?.signal?.aborted) return
        await Bun.sleep(15)
        yield { type: 'token', text: word }
      }
      yield { type: 'done', promptTokens: 400, completionTokens: 30 }
    },
  }
}

export function fakeEmbedder(dimension = 384): Embedder {
  return {
    dimension,
    queryInstruction: '',
    async embed(texts) {
      return texts.map(() => Array.from({ length: dimension }, (_, i) => (i === 0 ? 1 : 0)))
    },
  }
}

/** Returns the synthetic samples as search results, in a fixed order. */
export async function fakeRetriever(samplesDir = 'data/samples'): Promise<Retriever> {
  const chunks: RetrievedChunk[] = []
  for (const { entry, source } of await loadDocuments(samplesDir)) {
    const scenes = await splitScreenplay(entry.imdbId, source, { counter: approximateCounter })
    for (const scene of scenes) {
      chunks.push({
        id: `${scene.imdbId}:${scene.sceneIndex}:${scene.chunkIndex}`,
        score: 0.8 - chunks.length * 0.1,
        imdbId: scene.imdbId,
        title: entry.title,
        sceneIndex: scene.sceneIndex,
        chunkIndex: scene.chunkIndex,
        heading: scene.heading,
        text: scene.text,
      })
    }
  }
  return { retrieve: async (_vector, topK) => chunks.slice(0, topK) }
}
