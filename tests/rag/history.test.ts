import { expect, test } from 'bun:test'
import { calibrateCharsPerToken, fitHistory } from '../../src/rag/history'
import type { Turn } from '../../src/rag/types'

const turns = (n: number): Turn[] =>
  Array.from({ length: n }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: 'x'.repeat(300) }))

test('keeps the full history when it fits', () => {
  expect(fitHistory(turns(6), 1000, 10_000, 3)).toEqual({ history: turns(6), dropped: 0 })
})

test('drops the oldest user/assistant pairs only when needed', () => {
  // 1000 fixed chars + 6 x 300 = 2800 chars = 934 tokens at 3 chars/token; budget 800 tokens.
  const { history, dropped } = fitHistory(turns(6), 1000, 800, 3)
  expect(dropped).toBe(2)
  expect(history).toHaveLength(4)
  expect(history[0]?.role).toBe('user')
})

test('calibrates characters per token from the reported prompt size', () => {
  expect(calibrateCharsPerToken(4000, 1000, 3)).toBe(4)
  expect(calibrateCharsPerToken(4000, undefined, 3)).toBe(3)
})
