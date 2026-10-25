import { calibrateCharsPerToken, DEFAULT_CHARS_PER_TOKEN, fitHistory } from '../rag/history'
import { answerMessages, hydeMessages, searchQuery } from '../rag/prompts'
import type { RetrievedChunk, Turn } from '../rag/types'
import { blendVectors } from '../rag/vectors'
import type { Embedder } from './embedder'
import type { ChatMessage, ChatModel } from './llm'
import type { Retriever } from './retriever'

/** Tokens kept free for the answer itself. */
export const ANSWER_TOKENS = 1024
/** Length cap for the hypothetical passage. */
export const HYDE_TOKENS = 256

export interface RagDependencies {
  chat: ChatModel
  embedder: Embedder
  retriever: Retriever
  topK: number
  /** The model's context window (tokens). */
  contextTokens: number
}

/** Intermediate artefacts, only emitted when `trace` is requested (`ask --show-prompts`). */
export type TraceEvent =
  | { type: 'trace'; step: 'hyde-prompt'; messages: ChatMessage[] }
  | { type: 'trace'; step: 'search'; texts: string[]; topK: number }
  | { type: 'trace'; step: 'answer-prompt'; messages: ChatMessage[] }

export interface AnswerOptions {
  /** Characters per token for the history guard, calibrated from earlier answers. */
  charsPerToken?: number
  signal?: AbortSignal
  /** Emit `trace` events with the exact prompts and search texts. */
  trace?: boolean
}

export type RagEvent =
  | TraceEvent
  | { type: 'hypothesis'; text: string }
  | { type: 'sources'; chunks: RetrievedChunk[] }
  | { type: 'history-trimmed'; dropped: number }
  | { type: 'token'; text: string }
  | { type: 'done'; answer: string; charsPerToken: number }

/**
 * Answers one question with exactly two LLM calls: hypothesise a passage (HyDE), search with it blended with the question,
 * then answer from the retrieved scenes plus the conversation history.
 */
export async function* answerQuestion(
  question: string,
  history: readonly Turn[],
  deps: RagDependencies,
  options: AnswerOptions = {},
): AsyncGenerator<RagEvent> {
  const { charsPerToken = DEFAULT_CHARS_PER_TOKEN, signal, trace = false } = options

  const hydePrompt = hydeMessages(question, history)
  if (trace) yield { type: 'trace', step: 'hyde-prompt', messages: hydePrompt }
  const hypothesis = (await deps.chat.generate(hydePrompt, { maxTokens: HYDE_TOKENS, signal })).content.trim()
  yield { type: 'hypothesis', text: hypothesis }

  // Search with the question (as a query) blended with the hypothetical scene, so the search keeps what the
  // question names even when the hypothesis drifts.
  const query = deps.embedder.queryInstruction + searchQuery(question, history)
  const texts = [query, ...(hypothesis ? [hypothesis] : [])]
  if (trace) yield { type: 'trace', step: 'search', texts, topK: deps.topK }
  const chunks = await deps.retriever.retrieve(blendVectors(await deps.embedder.embed(texts)), deps.topK)
  yield { type: 'sources', chunks }

  const fixedChars = answerMessages(question, chunks, []).reduce((total, m) => total + m.content.length, 0)
  const fitted = fitHistory(history, fixedChars, deps.contextTokens - ANSWER_TOKENS, charsPerToken)
  if (fitted.dropped > 0) yield { type: 'history-trimmed', dropped: fitted.dropped }

  const messages = answerMessages(question, chunks, fitted.history)
  if (trace) yield { type: 'trace', step: 'answer-prompt', messages }
  const promptChars = messages.reduce((total, m) => total + m.content.length, 0)
  let answer = ''
  let calibrated = charsPerToken
  for await (const event of deps.chat.stream(messages, { maxTokens: ANSWER_TOKENS, signal })) {
    if (event.type === 'token') {
      answer += event.text
      yield event
    } else {
      calibrated = calibrateCharsPerToken(promptChars, event.promptTokens, charsPerToken)
    }
  }
  yield { type: 'done', answer, charsPerToken: calibrated }
}
