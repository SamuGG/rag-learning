# Configuration

All settings come from environment variables; Bun loads `.env` automatically. `.env.example` lists every variable with
its default. Configuration is validated on first use by `getConfig()` in `src/server/config.ts`.

| Variable              | Default                  | Notes                                           |
| --------------------- | ------------------------ | ----------------------------------------------- |
| `OLLAMA_HOST`         | `http://127.0.0.1:11434` | Ollama API                                      |
| `CHAT_MODEL`          | `qwen3.5:4b`             | Chat model name for the selected provider       |
| `OLLAMA_NUM_CTX`      | `8192`                   | Same value on every call to avoid model reloads |
| `OLLAMA_THINK`        | `false`                  | Qwen thinking mode                              |
| `LLM_TEMPERATURE`     | `0.7`                    | Qwen's recommendation for non-thinking mode     |
| `EMBEDDING_MODEL`     | `fast-bge-small-en-v1.5` | Fastembed model id                              |
| `EMBEDDING_CACHE_DIR` | `.cache/fastembed`       | Downloaded model files                          |
| `SCREENPLAYS_DIR`     | `data/screenplays`       | Holds `manifest.json` and the screenplay files  |
| `TOP_K`               | `5`                      | Chunks retrieved per question                   |
| `PINECONE_API_KEY`    | (required)               | Never logged; shown redacted                    |
| `PINECONE_INDEX`      | `rag-screenplays`        |                                                 |
| `PINECONE_NAMESPACE`  | `screenplays`            | `samples` holds the synthetic samples           |
| `HOST`                | `127.0.0.1`              | Keep the app off the local network              |
| `PORT`                | `3000`                   |                                                 |
| `BUN_CHROME_PATH`     | (unset)                  | Chrome/Chromium for `Bun.WebView` on Linux      |
| `FAKE_SERVICES`       | `false`                  | Fake LLM and retriever for end-to-end tests     |

Milestone M6 adds `LLM_PROVIDER` (`ollama` or `mlx`) and `MLX_HOST`.
