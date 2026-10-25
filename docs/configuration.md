# Configuration

All settings come from environment variables; Bun loads `.env` automatically and `.env.example` lists every variable
with its default. Configuration is validated on first use by `getConfig()` in `src/server/config.ts`; an invalid value
stops the CLIs with a clear message and shows a red banner in the chat page.

## Variables

| Variable              | Default                  | Notes                                                             |
| --------------------- | ------------------------ | ----------------------------------------------------------------- |
| `OLLAMA_HOST`         | `http://127.0.0.1:11434` | Ollama API                                                        |
| `CHAT_MODEL`          | `qwen3.5:4b`             | Any model you have pulled with Ollama                             |
| `OLLAMA_NUM_CTX`      | `8192`                   | Context window; sent unchanged on every call to avoid reloads     |
| `OLLAMA_THINK`        | `false`                  | Qwen thinking mode; keep off (slower, uses the answer budget)     |
| `LLM_TEMPERATURE`     | `0.7`                    | Qwen's recommendation for non-thinking mode                       |
| `EMBEDDING_MODEL`     | `fast-bge-small-en-v1.5` | Fastembed model id; only this one is supported                    |
| `EMBEDDING_CACHE_DIR` | `.cache/fastembed`       | Downloaded embedding model files                                  |
| `SCREENPLAYS_DIR`     | `data/screenplays`       | Holds `manifest.json` and the screenplay files                    |
| `TOP_K`               | `5`                      | Chunks retrieved per question (1–50)                              |
| `PINECONE_API_KEY`    | (required)               | Never logged in full; shown redacted                              |
| `PINECONE_INDEX`      | `rag-screenplays`        | Created on first ingest if missing                                |
| `PINECONE_NAMESPACE`  | `screenplays`            | See [namespaces](#namespaces)                                     |
| `HOST`                | `127.0.0.1`              | Keeps the app off the local network                               |
| `PORT`                | `3000`                   |                                                                   |
| `FAKE_SERVICES`       | `false`                  | Canned model, embedder and retriever (UI demos, end-to-end tests) |
| `BUN_CHROME_PATH`     | (unset)                  | Chrome/Chromium for `Bun.WebView` tests on Linux                  |
| `E2E_BASE_URL`        | (unset)                  | Run end-to-end tests against an already running app               |

## Namespaces

A Pinecone namespace is a separate set of records inside the index. Ingestion is one-shot per namespace.

| Namespace     | Holds                                     | Used with                                      |
| ------------- | ----------------------------------------- | ---------------------------------------------- |
| `screenplays` | Your own screenplays (default)            | `bun run ingest`, `bun run dev`, `bun run ask` |
| `samples`     | The two synthetic samples, kept for tests | `PINECONE_NAMESPACE=samples` on any command    |

Set the namespace per command (`PINECONE_NAMESPACE=samples bun run dev`) or in `.env`.

## Changing the model

Ollama is the only chat runner ([ADR-0005](adr/0005-single-llm-runner.md)). To try another model:

```sh
ollama pull <model>
CHAT_MODEL=<model> PINECONE_NAMESPACE=samples bun run ask --verbose "Who is trying to fix the engine?"
```

Check that answers stay grounded, cite `[1]` without warnings and say "not found" when appropriate, then set
`CHAT_MODEL` in `.env`. Models compared so far are listed in ADR-0005. Changing the **embedding** model would require a
reset and re-ingest.
