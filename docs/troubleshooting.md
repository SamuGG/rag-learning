# Troubleshooting

> Grows as issues are found; completed in milestone M5.

| Symptom                                               | Fix                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `PINECONE_API_KEY is required`                        | Copy `.env.example` to `.env` and set the key                                   |
| Commit rejected by `commitlint`                       | Use `type(scope): Sentence-case subject`, header up to 100 characters           |
| Commit rejected by cSpell                             | Fix the typo or add a genuine term to `cspell.json` `words`                     |
| Hooks do not run                                      | Run `bun install` (sets `core.hooksPath` for this repo)                         |
| `Bun.WebView` cannot find a browser (Linux)           | Set `BUN_CHROME_PATH` to a Chrome/Chromium binary                               |
| Ollama or MLX problems                                | See [Ollama](ollama.md) or [MLX](mlx.md)                                        |
| `Namespace "…" is not empty`                          | Ingestion is one-shot: `bun run reset-store --yes`, then `bun run ingest`       |
| `incomplete ingestion` / doctor shows ✗               | A previous run failed part-way: `bun run reset-store --yes` and re-run          |
| `Invalid documents:` list                             | Fix each listed manifest entry or file (size, UTF-8, line endings, IDs)         |
| `RecordTooLargeError`                                 | A single block is above 38 KB of text; split that part of the file              |
| `Ollama is unreachable at …`                          | Start Ollama (`brew services start ollama`) or check `OLLAMA_HOST`              |
| `Ollama returned HTTP 404 … ollama pull`              | Pull the model: `ollama pull qwen3.5:4b` (or fix `CHAT_MODEL`)                  |
| Answers say nothing was found                         | Check `PINECONE_NAMESPACE` points at an ingested namespace (`bun run doctor`)   |
| `Dropped N older messages` notice                     | The chat outgrew `OLLAMA_NUM_CTX`; start a new chat or raise the context window |
| Red banner in the chat page                           | Configuration or Pinecone problem; the banner shows the exact message           |
| Amber banner: Ollama not reachable / model not pulled | Start Ollama or `ollama pull <model>`, then click "New chat" to re-check        |
| Amber banner: namespace empty or incomplete           | `bun run ingest`, or `bun run reset-store --yes` then ingest                    |
| E2E: `Server did not start`                           | Run `bun run e2e` (it builds first) and check nothing else uses port 3100       |
