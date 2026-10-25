// Wires configuration to the RAG pipeline for the web app. Server-only.
import { type Config, getConfig } from './config'
import { createFastembedEmbedder } from './embedder'
import { fakeChatModel, fakeEmbedder, fakeRetriever } from './fake-services'
import { createChatModel } from './models'
import type { RagDependencies } from './rag'
import { createPineconeRetriever } from './retriever'
import { createPineconeStore, type IngestSummary } from './store'

export interface ServiceStatus {
  ok: boolean
  fake: boolean
  model?: string
  namespace?: string
  ingestion?: IngestSummary | null
  /** Problems that do not stop the app from starting (e.g. Ollama not running yet). */
  warnings: string[]
  error?: string
}

let dependencies: Promise<RagDependencies> | undefined

async function createDependencies(config: Config): Promise<RagDependencies> {
  if (config.fakeServices) {
    return {
      chat: fakeChatModel(),
      embedder: fakeEmbedder(),
      retriever: await fakeRetriever(),
      topK: config.topK,
      contextTokens: config.ollamaNumCtx,
    }
  }
  return {
    chat: createChatModel(config),
    embedder: await createFastembedEmbedder({ model: config.embeddingModel, cacheDir: config.embeddingCacheDir }),
    retriever: createPineconeRetriever(config.pinecone),
    topK: config.topK,
    contextTokens: config.ollamaNumCtx,
  }
}

/** Created once per server process; the embedding model loads on first use. */
export function getRagDependencies(): Promise<RagDependencies> {
  dependencies ??= createDependencies(getConfig()).catch(error => {
    dependencies = undefined
    throw error
  })
  return dependencies
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export async function getStatus(): Promise<ServiceStatus> {
  let config: Config
  try {
    config = getConfig()
  } catch (error) {
    return { ok: false, fake: false, warnings: [], error: message(error) }
  }
  const base = { fake: config.fakeServices, model: config.chatModel, namespace: config.pinecone.namespace }
  if (config.fakeServices) {
    return {
      ...base,
      ok: true,
      model: 'fake',
      namespace: 'samples (fake)',
      ingestion: { documents: 2, chunks: 2, ingestedAt: 'fake' },
      warnings: [],
    }
  }

  const warnings: string[] = []
  try {
    const response = await fetch(`${config.ollamaHost}/api/tags`, { signal: AbortSignal.timeout(2000) })
    const { models = [] } = (await response.json()) as { models?: { name: string }[] }
    if (!models.some(m => m.name === config.chatModel)) {
      warnings.push(`Model ${config.chatModel} is not pulled. Run: ollama pull ${config.chatModel}`)
    }
  } catch {
    warnings.push(`Ollama is not reachable at ${config.ollamaHost}. Start it: brew services start ollama`)
  }

  try {
    const state = await createPineconeStore(config.pinecone).state()
    if (!state.sentinel) {
      warnings.push(
        state.records > 0
          ? `Namespace "${config.pinecone.namespace}" holds an incomplete ingestion. Run: bun run reset-store --yes`
          : `Namespace "${config.pinecone.namespace}" is empty. Run: bun run ingest`,
      )
    }
    return { ...base, ok: true, ingestion: state.sentinel, warnings }
  } catch (error) {
    return { ...base, ok: false, warnings, error: `Pinecone: ${message(error)}` }
  }
}
