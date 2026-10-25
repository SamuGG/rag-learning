// Server-only configuration. Never import this from client code or from the chunker.

export interface Config {
  ollamaHost: string
  ollamaNumCtx: number
  ollamaThink: boolean
  chatModel: string
  embeddingModel: string
  embeddingCacheDir: string
  screenplaysDir: string
  topK: number
  llmTemperature: number
  host: string
  port: number
  pinecone: { apiKey: string; index: string; namespace: string }
  fakeServices: boolean
}

export class ConfigError extends Error {
  override name = 'ConfigError'
}

type Env = Record<string, string | undefined>

const str = (env: Env, key: string, fallback: string): string => {
  const value = env[key]?.trim()
  return value ? value : fallback
}

const int = (env: Env, key: string, fallback: number, min: number, max: number): number => {
  const raw = env[key]?.trim()
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ConfigError(`${key} must be an integer between ${min} and ${max}, got "${raw}"`)
  }
  return value
}

const num = (env: Env, key: string, fallback: number, min: number, max: number): number => {
  const raw = env[key]?.trim()
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ConfigError(`${key} must be a number between ${min} and ${max}, got "${raw}"`)
  }
  return value
}

const bool = (env: Env, key: string, fallback: boolean): boolean => {
  const raw = env[key]?.trim().toLowerCase()
  if (!raw) return fallback
  if (raw === 'true' || raw === '1') return true
  if (raw === 'false' || raw === '0') return false
  throw new ConfigError(`${key} must be true or false, got "${raw}"`)
}

/** Parses and validates configuration from an environment map. */
export function parseConfig(env: Env): Config {
  const fakeServices = bool(env, 'FAKE_SERVICES', false)
  const apiKey = env.PINECONE_API_KEY?.trim() ?? ''
  if (!apiKey && !fakeServices) {
    throw new ConfigError('PINECONE_API_KEY is required (see .env.example)')
  }
  return {
    ollamaHost: str(env, 'OLLAMA_HOST', 'http://127.0.0.1:11434'),
    ollamaNumCtx: int(env, 'OLLAMA_NUM_CTX', 8192, 2048, 262144),
    ollamaThink: bool(env, 'OLLAMA_THINK', false),
    chatModel: str(env, 'CHAT_MODEL', 'qwen3.5:4b'),
    embeddingModel: str(env, 'EMBEDDING_MODEL', 'fast-bge-small-en-v1.5'),
    embeddingCacheDir: str(env, 'EMBEDDING_CACHE_DIR', '.cache/fastembed'),
    screenplaysDir: str(env, 'SCREENPLAYS_DIR', 'data/screenplays'),
    topK: int(env, 'TOP_K', 5, 1, 50),
    llmTemperature: num(env, 'LLM_TEMPERATURE', 0.7, 0, 2),
    host: str(env, 'HOST', '127.0.0.1'),
    port: int(env, 'PORT', 3000, 1, 65535),
    pinecone: {
      apiKey,
      index: str(env, 'PINECONE_INDEX', 'rag-screenplays'),
      namespace: str(env, 'PINECONE_NAMESPACE', 'screenplays'),
    },
    fakeServices,
  }
}

let cached: Config | undefined

/** Lazily validated configuration from the process environment. */
export function getConfig(): Config {
  cached ??= parseConfig(process.env)
  return cached
}

/** Masks a secret for logs, keeping only the last four characters. */
export function redact(secret: string): string {
  return secret.length <= 4 ? '****' : `****${secret.slice(-4)}`
}
