import type { Config } from './config'
import type { ChatModel } from './llm'
import { createOllamaChatModel } from './ollama'

/** The configured chat model. M6 adds an MLX alternative selected by LLM_PROVIDER. */
export function createChatModel(config: Config): ChatModel {
  return createOllamaChatModel({
    host: config.ollamaHost,
    model: config.chatModel,
    numCtx: config.ollamaNumCtx,
    temperature: config.llmTemperature,
    think: config.ollamaThink,
  })
}
