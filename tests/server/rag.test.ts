import { expect, test } from 'bun:test'
import type { RetrievedChunk, Turn } from '../../src/rag/types'
import { answerQuestion, type RagEvent } from '../../src/server/rag'
import { fakeChatModel, fakeEmbedder, fakeRetriever } from './fakes'

const chunks: RetrievedChunk[] = [
  {
    id: 'tt0000001:0:0',
    score: 0.55,
    imdbId: 'tt0000001',
    title: 'Frozen Canyon',
    sceneIndex: 0,
    chunkIndex: 0,
    heading: 'EXT. FROZEN CANYON - TWILIGHT',
    text: 'EXT. FROZEN CANYON - TWILIGHT\n\nA battered freighter rests in the snow.\n',
  },
]

const collect = async (events: AsyncIterable<RagEvent>) => {
  const all: RagEvent[] = []
  for await (const event of events) all.push(event)
  return all
}

test('makes exactly two LLM calls and searches with the hypothetical passage', async () => {
  const chat = fakeChatModel()
  const embedder = fakeEmbedder()
  const retriever = fakeRetriever(chunks)
  const events = await collect(
    answerQuestion('Who fixes the engine?', [], { chat, embedder, retriever, topK: 5, contextTokens: 8192 }),
  )

  expect(chat.calls.map(c => c.kind)).toEqual(['generate', 'stream'])
  expect(embedder.inputs).toEqual(['query: Who fixes the engine?', 'EXT. CANYON - NIGHT\n\nA pilot repairs an engine.'])
  const [searched] = retriever.vectors
  expect(Math.hypot(...(searched ?? []))).toBeCloseTo(1, 6)
  const types = [...new Set(events.map(e => e.type))]
  expect(types).toEqual(['hypothesis', 'sources', 'token', 'done'])
  const done = events.at(-1)
  expect(done?.type === 'done' && done.answer).toContain('[1]')
  expect(done?.type === 'done' && done.charsPerToken).toBeCloseTo(4, 0)
  expect(chat.calls[1]?.messages.at(-1)?.content).toContain('[1] Frozen Canyon — EXT. FROZEN CANYON - TWILIGHT\nEXT.')
})

test('trims history only when the context window would overflow', async () => {
  const history: Turn[] = Array.from({ length: 10 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: 'y'.repeat(2000),
  }))
  const chat = fakeChatModel()
  const deps = { chat, embedder: fakeEmbedder(), retriever: fakeRetriever(chunks), topK: 5 }

  const roomy = await collect(answerQuestion('Q?', history, { ...deps, contextTokens: 32_768 }))
  expect(roomy.some(e => e.type === 'history-trimmed')).toBe(false)

  const tight = await collect(answerQuestion('Q?', history, { ...deps, contextTokens: 4096 }))
  const trimmed = tight.find(e => e.type === 'history-trimmed')
  expect(trimmed?.type === 'history-trimmed' && trimmed.dropped).toBeGreaterThan(0)
})

test('follow-up searches include the previous question', async () => {
  const embedder = fakeEmbedder()
  const history: Turn[] = [
    { role: 'user', content: 'What happens at the mining outpost?' },
    { role: 'assistant', content: 'Smugglers sneak in.' },
  ]
  await collect(
    answerQuestion('Does their plan work?', history, {
      chat: fakeChatModel(),
      embedder,
      retriever: fakeRetriever(chunks),
      topK: 5,
      contextTokens: 8192,
    }),
  )
  expect(embedder.inputs[0]).toBe('query: What happens at the mining outpost?\nDoes their plan work?')
})

test('trace events appear only when requested, in order, with the exact search texts', async () => {
  const deps = {
    chat: fakeChatModel(),
    embedder: fakeEmbedder(),
    retriever: fakeRetriever(chunks),
    topK: 5,
    contextTokens: 8192,
  }
  const plain = await collect(answerQuestion('Who fixes the engine?', [], deps))
  expect(plain.some(e => e.type === 'trace')).toBe(false)

  const traced = await collect(answerQuestion('Who fixes the engine?', [], deps, { trace: true }))
  const steps = traced.flatMap(e => (e.type === 'trace' ? [e.step] : []))
  expect(steps).toEqual(['hyde-prompt', 'search', 'answer-prompt'])
  const search = traced.find(e => e.type === 'trace' && e.step === 'search')
  expect(search?.type === 'trace' && search.step === 'search' && search.texts).toEqual([
    'query: Who fixes the engine?',
    'EXT. CANYON - NIGHT\n\nA pilot repairs an engine.',
  ])
})
