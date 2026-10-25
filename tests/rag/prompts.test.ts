import { describe, expect, test } from 'bun:test'
import {
  ANSWER_SYSTEM_PROMPT,
  answerMessages,
  chunkLabel,
  formatExcerpts,
  HYDE_SYSTEM_PROMPT,
  hydeMessages,
  NO_EXCERPTS,
  searchQuery,
} from '../../src/rag/prompts'
import type { RetrievedChunk, Turn } from '../../src/rag/types'

const chunk = (overrides: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  id: 'tt0000001:0:0',
  score: 0.5,
  imdbId: 'tt0000001',
  title: 'Frozen Canyon',
  sceneIndex: 0,
  chunkIndex: 0,
  heading: 'EXT. FROZEN CANYON - TWILIGHT',
  text: 'EXT. FROZEN CANYON - TWILIGHT\n\nSnow.\n',
  ...overrides,
})

const history: Turn[] = Array.from({ length: 6 }, (_, i) => ({
  role: i % 2 === 0 ? 'user' : 'assistant',
  content: `turn ${i}`,
}))

describe('prompts', () => {
  test('labels chunks with title and heading, or the scene number', () => {
    expect(chunkLabel(chunk())).toBe('Frozen Canyon — EXT. FROZEN CANYON - TWILIGHT')
    expect(chunkLabel(chunk({ heading: null, sceneIndex: 4 }))).toBe('Frozen Canyon — scene 5')
  })

  test('prefixes every excerpt with its label', () => {
    const text = formatExcerpts([chunk(), chunk({ title: 'Asteroid Outpost', heading: null })])
    expect(text).toContain('[1] Frozen Canyon — EXT. FROZEN CANYON - TWILIGHT\nEXT. FROZEN CANYON')
    expect(text).toContain('---\n\n[2] Asteroid Outpost — scene 1')
    expect(formatExcerpts([])).toBe(NO_EXCERPTS)
  })

  test('the HyDE call sees only the last four turns', () => {
    const [, user] = hydeMessages('What next?', history)
    expect(user?.content).toContain('Assistant: turn 5')
    expect(user?.content).toContain('User: turn 2')
    expect(user?.content).not.toContain('turn 1')
    expect(user?.content.endsWith('Question: What next?')).toBe(true)
  })

  test('the answer call carries the full history, then excerpts and question', () => {
    const messages = answerMessages('Who repairs it?', [chunk()], history)
    expect(messages).toHaveLength(1 + history.length + 1)
    expect(messages[0]?.role).toBe('system')
    expect(messages.at(-1)?.content).toMatch(
      /^Scene excerpts:\n\n\[1\] Frozen Canyon[\s\S]*Question: Who repairs it\?$/,
    )
  })

  test('HyDE keeps what the question names; answers cite excerpt numbers', () => {
    expect(HYDE_SYSTEM_PROMPT).toContain('use their exact names')
    expect(HYDE_SYSTEM_PROMPT).toContain('Do not invent new character names')
    expect(ANSWER_SYSTEM_PROMPT).toContain('by their number in square brackets')
  })

  test('answers may infer from the excerpts and resolve references from the conversation', () => {
    expect(ANSWER_SYSTEM_PROMPT).toContain('reasonable inferences')
    expect(ANSWER_SYSTEM_PROMPT).toContain('what the question refers to')
  })

  test('the search query carries the previous user question', () => {
    expect(searchQuery('Does their plan work?', [])).toBe('Does their plan work?')
    expect(searchQuery('Does their plan work?', history)).toBe('turn 4\nDoes their plan work?')
  })
})
