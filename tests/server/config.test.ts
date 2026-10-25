import { describe, expect, test } from 'bun:test'
import { ConfigError, parseConfig, redact } from '../../src/server/config'

describe('parseConfig', () => {
  test('applies defaults', () => {
    const config = parseConfig({ PINECONE_API_KEY: 'pc-secret' })
    expect(config.chatModel).toBe('qwen3.5:4b')
    expect(config.topK).toBe(5)
    expect(config.host).toBe('127.0.0.1')
  })

  test('requires a Pinecone key unless services are faked', () => {
    expect(() => parseConfig({})).toThrow(ConfigError)
    expect(parseConfig({ FAKE_SERVICES: 'true' }).fakeServices).toBe(true)
  })

  test('rejects invalid numbers', () => {
    expect(() => parseConfig({ PINECONE_API_KEY: 'k', TOP_K: 'many' })).toThrow(ConfigError)
  })
})

test('redact keeps only the last four characters', () => {
  expect(redact('pc-1234567890')).toBe('****7890')
})
