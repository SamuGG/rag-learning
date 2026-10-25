// Ask questions about the ingested screenplays from the terminal.
// Usage: bun run ask "question" [--verbose]   one question
//        bun run ask [--verbose]              interactive session (history kept in memory until you quit)
import { parseArgs } from 'node:util'
import { DEFAULT_CHARS_PER_TOKEN } from '../src/rag/history'
import { chunkLabel } from '../src/rag/prompts'
import type { Turn } from '../src/rag/types'
import { getConfig } from '../src/server/config'
import { createFastembedEmbedder } from '../src/server/embedder'
import { ChatModelError } from '../src/server/llm'
import { createChatModel } from '../src/server/models'
import { answerQuestion, type RagDependencies } from '../src/server/rag'
import { createPineconeRetriever } from '../src/server/retriever'

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: { verbose: { type: 'boolean', short: 'v', default: false } },
})

const config = getConfig()
const deps: RagDependencies = {
  chat: createChatModel(config),
  embedder: await createFastembedEmbedder({ model: config.embeddingModel, cacheDir: config.embeddingCacheDir }),
  retriever: createPineconeRetriever(config.pinecone),
  topK: config.topK,
  contextTokens: config.ollamaNumCtx,
}

const history: Turn[] = []
let charsPerToken = DEFAULT_CHARS_PER_TOKEN
let sources: string[] = []

async function ask(question: string) {
  for await (const event of answerQuestion(question, history, deps, charsPerToken)) {
    switch (event.type) {
      case 'hypothesis':
        if (values.verbose) console.log(`\x1b[2m[hypothesis]\n${event.text}\x1b[0m\n`)
        break
      case 'history-trimmed':
        console.log(`\x1b[33m(Dropped ${event.dropped} older messages to fit the context window.)\x1b[0m`)
        break
      case 'token':
        process.stdout.write(event.text)
        break
      case 'sources':
        if (event.chunks.length === 0) console.log('\x1b[33m(No matching scenes found.)\x1b[0m')
        sources = event.chunks.map(c => `  ${chunkLabel(c)} ${c.id} score ${c.score.toFixed(3)}`)
        break
      case 'done':
        charsPerToken = event.charsPerToken
        history.push({ role: 'user', content: question }, { role: 'assistant', content: event.answer })
        console.log(`\n\n\x1b[2mSources:\n${sources.join('\n')}\x1b[0m`)
        break
    }
  }
}

try {
  const question = positionals.join(' ').trim()
  if (question) {
    await ask(question)
  } else {
    console.log(
      `Asking about namespace "${config.pinecone.namespace}" with ${deps.chat.name}. Empty line or Ctrl+D quits.`,
    )
    process.stdout.write('\n> ')
    for await (const line of console) {
      const next = line.trim()
      if (!next) break
      await ask(next)
      process.stdout.write('\n> ')
    }
  }
} catch (error) {
  console.error(error instanceof ChatModelError ? error.message : error)
  process.exit(1)
}
