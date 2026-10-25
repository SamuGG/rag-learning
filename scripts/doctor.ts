// Health check for local services and configuration. Secrets are never printed in full.
// Usage: bun run doctor
import { Pinecone } from '@pinecone-database/pinecone'
import type { EmbeddingModel } from 'fastembed'
import { tokenizerPath } from '../src/ingest/tokens'
import { getConfig, redact } from '../src/server/config'
import { createPineconeStore } from '../src/server/store'

type Status = 'ok' | 'warn' | 'fail'
let failed = false

const report = (status: Status, check: string, detail: string) => {
  if (status === 'fail') failed = true
  const mark = status === 'ok' ? '✓' : status === 'warn' ? '!' : '✗'
  console.log(`${mark} ${check.padEnd(18)} ${detail}`)
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

async function checkOllama(host: string, model: string, numCtx: number) {
  try {
    const tags = (await (await fetch(`${host}/api/tags`)).json()) as { models: { name: string }[] }
    report('ok', 'Ollama', host)
    if (!tags.models.some(m => m.name === model)) {
      report('fail', 'Chat model', `${model} not pulled (run: ollama pull ${model})`)
      return
    }
    const started = performance.now()
    const response = await fetch(`${host}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
        think: false,
        stream: false,
        options: { num_ctx: numCtx, num_predict: 8 },
      }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    const body = (await response.json()) as { message: { content: string; thinking?: string } }
    const ms = Math.round(performance.now() - started)
    const thinking = body.message.thinking ? ' (unexpected thinking output)' : ''
    report(thinking ? 'warn' : 'ok', 'Chat model', `${model} answered in ${ms} ms with think:false${thinking}`)
  } catch (error) {
    report('fail', 'Ollama', `${host} unreachable: ${message(error)} (start it: brew services start ollama)`)
  }
}

async function checkPinecone(apiKey: string, indexName: string, namespace: string) {
  try {
    const pc = new Pinecone({ apiKey })
    const index = await pc.describeIndex(indexName)
    const detail = `${indexName} (${index.dimension} dims, ${index.metric}, ready=${index.status?.ready})`
    report(index.dimension === 384 ? 'ok' : 'fail', 'Pinecone index', detail)
    const state = await createPineconeStore({ apiKey, index: indexName, namespace }).state()
    if (state.sentinel) {
      const { documents, chunks, ingestedAt } = state.sentinel
      report('ok', 'Ingestion', `namespace "${namespace}": ${documents} documents, ${chunks} chunks at ${ingestedAt}`)
    } else if (state.records > 0) {
      report(
        'fail',
        'Ingestion',
        `namespace "${namespace}": ${state.records} records, incomplete (bun run reset-store --yes)`,
      )
    } else {
      report('warn', 'Ingestion', `namespace "${namespace}" is empty (run: bun run ingest)`)
    }
  } catch (error) {
    report('fail', 'Pinecone', `key ${redact(apiKey)}: ${message(error)}`)
  }
}

let config: ReturnType<typeof getConfig>
try {
  config = getConfig()
  const key = config.pinecone.apiKey
    ? `Pinecone key ${redact(config.pinecone.apiKey)}`
    : 'no Pinecone key (FAKE_SERVICES)'
  report('ok', 'Config', `valid, ${key}`)
} catch (error) {
  report('fail', 'Config', message(error))
  process.exit(1)
}

await checkOllama(config.ollamaHost, config.chatModel, config.ollamaNumCtx)

const tokenizer = tokenizerPath(config.embeddingCacheDir, config.embeddingModel as EmbeddingModel)
if (!tokenizer) report('fail', 'Embedding model', `unsupported EMBEDDING_MODEL "${config.embeddingModel}"`)
else if (await Bun.file(tokenizer).exists()) report('ok', 'Embedding model', `${config.embeddingModel} cached`)
else report('warn', 'Embedding model', `${config.embeddingModel} not cached yet (downloads on first use)`)

if (config.pinecone.apiKey)
  await checkPinecone(config.pinecone.apiKey, config.pinecone.index, config.pinecone.namespace)

process.exit(failed ? 1 : 0)
