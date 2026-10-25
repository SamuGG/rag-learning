import type { Config } from './config'
import type { ChatModel } from './llm'
import { createOllamaChatModel } from './ollama'

/** The configured chat model. Ollama is the only runner (ADR-0005); it uses MLX on Apple Silicon. */
export function createChatModel(config: Config): ChatModel {
  return createOllamaChatModel({
    host: config.ollamaHost,
    model: config.chatModel,
    numCtx: config.ollamaNumCtx,
    temperature: config.llmTemperature,
    think: config.ollamaThink,
  })
}
