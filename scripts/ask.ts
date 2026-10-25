// Ask questions about the ingested screenplays from the terminal.
// Usage: bun run ask "question" [--verbose] [--show-prompts]   one question
//        bun run ask [--verbose] [--show-prompts]              interactive session (history kept until you quit)
// --verbose shows the HyDE passage; --show-prompts also prints every prompt, the search texts and the scores.
import { parseArgs } from 'node:util'
import { findCitations, resolveCitations, unmatchedCitations } from '../src/rag/citations'
import { DEFAULT_CHARS_PER_TOKEN } from '../src/rag/history'
import { chunkLabel } from '../src/rag/prompts'
import type { RetrievedChunk, Turn } from '../src/rag/types'
import { getConfig } from '../src/server/config'
import { createFastembedEmbedder } from '../src/server/embedder'
import type { ChatMessage } from '../src/server/llm'
import { ChatModelError } from '../src/server/llm'
import { createChatModel } from '../src/server/models'
import { answerQuestion, type RagDependencies, type TraceEvent } from '../src/server/rag'
import { createPineconeRetriever } from '../src/server/retriever'

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    verbose: { type: 'boolean', short: 'v', default: false },
    'show-prompts': { type: 'boolean', default: false },
  },
})

const config = getConfig()
const deps: RagDependencies = {
  chat: createChatModel(config),
  embedder: await createFastembedEmbedder({ model: config.embeddingModel, cacheDir: config.embeddingCacheDir }),
  retriever: createPineconeRetriever(config.pinecone),
  topK: config.topK,
  contextTokens: config.ollamaNumCtx,
}

const showPrompts = values['show-prompts']
const dim = (text: string) => `\x1b[2m${text}\x1b[0m`
const heading = (title: string) =>
  console.log(`\n\x1b[36m── ${title} ${'─'.repeat(Math.max(0, 70 - title.length))}\x1b[0m`)
const printMessages = (messages: ChatMessage[]) => {
  for (const m of messages) console.log(`${dim(`[${m.role}]`)}\n${m.content}\n`)
}

function printTrace(event: TraceEvent) {
  if (event.step === 'hyde-prompt') {
    heading('1. HyDE prompt (LLM call 1)')
    printMessages(event.messages)
  } else if (event.step === 'search') {
    heading(`3. Search texts (embedded, averaged, top ${event.topK})`)
    for (const [i, text] of event.texts.entries()) console.log(`${dim(`[text ${i + 1}]`)}\n${text}\n`)
  } else {
    heading('5. Answer prompt (LLM call 2)')
    printMessages(event.messages)
    heading('6. Answer (streamed)')
  }
}

const history: Turn[] = []
let charsPerToken = DEFAULT_CHARS_PER_TOKEN
let sources: RetrievedChunk[] = []

function printSources(answer: string) {
  const cited = findCitations(answer)
  const lines = sources.map((c, i) => {
    const mark = cited.includes(i + 1) ? '*' : ' '
    return `${mark} [${i + 1}] ${chunkLabel(c)}  ${c.id} score ${c.score.toFixed(3)}`
  })
  console.log(`\n\n\x1b[2mSources (* cited):\n${lines.join('\n')}\x1b[0m`)
  for (const n of unmatchedCitations(answer, sources.length)) {
    console.log(`\x1b[33mUnverified citation [${n}]: no excerpt has that number.\x1b[0m`)
  }
}

async function ask(question: string) {
  for await (const event of answerQuestion(question, history, deps, { charsPerToken, trace: showPrompts })) {
    switch (event.type) {
      case 'trace':
        printTrace(event)
        break
      case 'hypothesis':
        if (showPrompts) {
          heading('2. Hypothetical scene (output of call 1)')
          console.log(event.text)
        } else if (values.verbose) console.log(`\x1b[2m[hypothesis]\n${event.text}\x1b[0m\n`)
        break
      case 'history-trimmed':
        console.log(`\x1b[33m(Dropped ${event.dropped} older messages to fit the context window.)\x1b[0m`)
        break
      case 'token':
        process.stdout.write(event.text)
        break
      case 'sources':
        if (event.chunks.length === 0) console.log('\x1b[33m(No matching scenes found.)\x1b[0m')
        sources = event.chunks
        if (showPrompts) {
          heading('4. Retrieved scenes (Pinecone, filtered to chunks)')
          for (const [i, c] of sources.entries())
            console.log(`[${i + 1}] ${chunkLabel(c)}  ${c.id}  score ${c.score.toFixed(3)}`)
        }
        break
      case 'done':
        charsPerToken = event.charsPerToken
        history.push(
          { role: 'user', content: question },
          { role: 'assistant', content: resolveCitations(event.answer, sources) },
        )
        printSources(event.answer)
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
