import { type ChatEvent, type ChatMessage, type ChatModel, ChatModelError, type GenerateOptions } from './llm'

export interface OllamaOptions {
  host: string
  model: string
  /** Context window. Sent unchanged on every request so Ollama never reloads the model. */
  numCtx: number
  temperature: number
  /** Qwen 3.5 thinks unless `think: false` is sent explicitly. */
  think: boolean
  keepAlive?: string
}

interface OllamaChunk {
  message?: { content?: string; thinking?: string }
  done?: boolean
  error?: string
  prompt_eval_count?: number
  eval_count?: number
}

/** Ollama's `/api/chat` over `fetch`; streaming responses are NDJSON. `message.thinking` is ignored. */
export function createOllamaChatModel(options: OllamaOptions): ChatModel {
  const { host, model, numCtx, temperature, think, keepAlive = '10m' } = options

  const request = async (messages: readonly ChatMessage[], stream: boolean, generate: GenerateOptions = {}) => {
    let response: Response
    try {
      response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: generate.signal,
        body: JSON.stringify({
          model,
          messages,
          stream,
          think,
          keep_alive: keepAlive,
          options: {
            num_ctx: numCtx,
            temperature,
            ...(generate.maxTokens === undefined ? {} : { num_predict: generate.maxTokens }),
          },
        }),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new ChatModelError(`Ollama is unreachable at ${host} (${reason}). Start it: brew services start ollama`)
    }
    if (!response.ok) {
      const body = await response.text()
      const hint = response.status === 404 ? ` (pull it: ollama pull ${model})` : ''
      throw new ChatModelError(`Ollama returned HTTP ${response.status}: ${body.trim()}${hint}`)
    }
    return response
  }

  return {
    name: `ollama:${model}`,

    async generate(messages, generate) {
      const chunk = (await (await request(messages, false, generate)).json()) as OllamaChunk
      if (chunk.error) throw new ChatModelError(`Ollama error: ${chunk.error}`)
      return {
        content: chunk.message?.content ?? '',
        promptTokens: chunk.prompt_eval_count,
        completionTokens: chunk.eval_count,
      }
    },

    async *stream(messages, generate): AsyncGenerator<ChatEvent> {
      const response = await request(messages, true, generate)
      if (!response.body) throw new ChatModelError('Ollama returned an empty stream')
      const decoder = new TextDecoder()
      let buffer = ''
      for await (const bytes of response.body) {
        buffer += decoder.decode(bytes, { stream: true })
        let newline = buffer.indexOf('\n')
        while (newline !== -1) {
          const line = buffer.slice(0, newline).trim()
          buffer = buffer.slice(newline + 1)
          newline = buffer.indexOf('\n')
          if (line === '') continue
          const chunk = JSON.parse(line) as OllamaChunk
          if (chunk.error) throw new ChatModelError(`Ollama error: ${chunk.error}`)
          const text = chunk.message?.content
          if (text) yield { type: 'token', text }
          if (chunk.done) {
            yield { type: 'done', promptTokens: chunk.prompt_eval_count, completionTokens: chunk.eval_count }
            return
          }
        }
      }
      throw new ChatModelError('Ollama stream ended without a final message')
    },
  }
}
