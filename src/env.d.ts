declare namespace Bun {
  interface Env {
    readonly OLLAMA_HOST?: string
    readonly OLLAMA_NUM_CTX?: string
    readonly OLLAMA_THINK?: string
    readonly CHAT_MODEL?: string
    readonly EMBEDDING_MODEL?: string
    readonly EMBEDDING_CACHE_DIR?: string
    readonly SCREENPLAYS_DIR?: string
    readonly TOP_K?: string
    readonly LLM_TEMPERATURE?: string
    readonly HOST?: string
    readonly PORT?: string
    readonly PINECONE_API_KEY?: string
    readonly PINECONE_INDEX?: string
    readonly PINECONE_NAMESPACE?: string
    readonly BUN_CHROME_PATH?: string
    readonly FAKE_SERVICES?: string
  }
}
