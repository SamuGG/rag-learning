import { describe, expect, test } from 'bun:test'
import { validateManifest } from '../../src/ingest/manifest'

const entry = (overrides: Record<string, unknown> = {}) => ({
  file: 'a.txt',
  title: 'A Film',
  imdbId: 'tt0000001',
  ...overrides,
})

describe('validateManifest', () => {
  test('accepts valid entries', () => {
    const result = validateManifest([entry(), entry({ file: 'b.txt', imdbId: 'tt12345678', synthetic: true })])
    expect(result.errors).toEqual([])
    expect(result.entries).toHaveLength(2)
    expect(result.entries[1]?.synthetic).toBe(true)
  })

  test.each([
    ['not an array', { file: 'a.txt' }, 'JSON array'],
    ['empty', [], 'no documents'],
    ['too many', Array.from({ length: 11 }, (_, i) => entry({ file: `${i}.txt`, imdbId: `tt000000${i}` })), 'limit'],
    ['absolute path', [entry({ file: '/etc/passwd' })], 'relative path'],
    ['parent folder', [entry({ file: '../secret.txt' })], 'relative path'],
    ['duplicate file', [entry(), entry({ imdbId: 'tt0000002' })], 'listed twice'],
    ['empty title', [entry({ title: '  ' })], 'non-empty'],
    ['long title', [entry({ title: 'x'.repeat(201) })], 'longer than'],
    ['bad id', [entry({ imdbId: 'nm0000001' })], 'tt1234567'],
    ['duplicate id', [entry(), entry({ file: 'b.txt' })], 'listed twice'],
    ['bad synthetic', [entry({ synthetic: 'yes' })], 'true or false'],
    ['unknown key', [entry({ year: 1999 })], 'unknown key'],
  ])('rejects %s', (_, json, message) => {
    const result = validateManifest(json)
    expect(result.entries).toEqual([])
    expect(result.errors.join('\n')).toContain(message)
  })

  test('reports every problem, not just the first', () => {
    expect(validateManifest([entry({ title: '', imdbId: 'x' })]).errors).toHaveLength(2)
  })
})
