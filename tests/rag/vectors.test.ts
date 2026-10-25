import { expect, test } from 'bun:test'
import { blendVectors } from '../../src/rag/vectors'

test('averages and re-normalises', () => {
  const blended = blendVectors([
    [1, 0],
    [0, 1],
  ])
  expect(blended[0]).toBeCloseTo(Math.SQRT1_2, 10)
  expect(blended[1]).toBeCloseTo(Math.SQRT1_2, 10)
})

test('a single unit vector is unchanged', () => {
  expect(blendVectors([[0.6, 0.8]])).toEqual([0.6, 0.8])
})

test('rejects empty input and mixed dimensions', () => {
  expect(() => blendVectors([])).toThrow('at least one')
  expect(() => blendVectors([[1, 0], [1]])).toThrow('same dimension')
})
