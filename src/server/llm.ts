export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateOptions {
  /** Upper bound on generated tokens. */
  maxTokens?: number
  signal?: AbortSignal
}

export interface ChatUsage {
  /** Tokens the model read for the prompt, when the server reports it. */
  promptTokens?: number
  completionTokens?: number
}

export type ChatEvent = { type: 'token'; text: string } | ({ type: 'done' } & ChatUsage)

/** A chat model server: Ollama now, MLX later (M6). Exactly one is used at a time. */
export interface ChatModel {
  readonly name: string
  generate(messages: readonly ChatMessage[], options?: GenerateOptions): Promise<{ content: string } & ChatUsage>
  stream(messages: readonly ChatMessage[], options?: GenerateOptions): AsyncIterable<ChatEvent>
}

export class ChatModelError extends Error {
  override name = 'ChatModelError'
}
