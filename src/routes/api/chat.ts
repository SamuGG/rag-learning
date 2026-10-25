import type { APIEvent } from '@solidjs/start/server'
import { ndjsonResponse } from '~/lib/ndjson'
import type { Turn } from '~/rag/types'
import { getRagDependencies } from '~/server/chat-service'
import { answerQuestion, type RagEvent, type TraceEvent } from '~/server/rag'

export type ChatStreamEvent = Exclude<RagEvent, TraceEvent> | { type: 'error'; message: string }

export interface ChatRequest {
  question: string
  history: Turn[]
  charsPerToken?: number
}

const MAX_QUESTION_LENGTH = 2000

function parseRequest(body: unknown): ChatRequest | string {
  if (typeof body !== 'object' || body === null) return 'Expected a JSON object'
  const { question, history = [], charsPerToken } = body as Record<string, unknown>
  if (typeof question !== 'string' || question.trim() === '') return 'Ask a question first'
  if (question.length > MAX_QUESTION_LENGTH) return `Questions are limited to ${MAX_QUESTION_LENGTH} characters`
  const validTurns =
    Array.isArray(history)
    && history.every(
      t =>
        typeof t === 'object'
        && t !== null
        && (t.role === 'user' || t.role === 'assistant')
        && typeof t.content === 'string',
    )
  if (!validTurns) return 'Invalid conversation history'
  if (charsPerToken !== undefined && (typeof charsPerToken !== 'number' || !(charsPerToken > 0)))
    return 'Invalid charsPerToken'
  return { question: question.trim(), history: history as Turn[], charsPerToken: charsPerToken as number | undefined }
}

async function* events(request: ChatRequest, signal: AbortSignal): AsyncGenerator<ChatStreamEvent> {
  try {
    const deps = await getRagDependencies()
    for await (const event of answerQuestion(request.question, request.history, deps, {
      charsPerToken: request.charsPerToken,
      signal,
    })) {
      // Trace events are only produced on request (ask --show-prompts); never forward them to the browser.
      if (event.type !== 'trace') yield event
    }
  } catch (error) {
    if (signal.aborted) return
    yield { type: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}

export async function POST({ request }: APIEvent) {
  let parsed: ChatRequest | string
  try {
    parsed = parseRequest(await request.json())
  } catch {
    parsed = 'Expected a JSON body'
  }
  if (typeof parsed === 'string') return Response.json({ error: parsed }, { status: 400 })
  return ndjsonResponse(events(parsed, request.signal), request.signal)
}
