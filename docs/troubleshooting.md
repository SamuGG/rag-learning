# Troubleshooting

Start with `bun run doctor`: it checks configuration, Ollama, the model, the embedding cache and Pinecone, and prints
the fix for each problem.

## Setup and configuration

| Symptom                                      | Fix                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `PINECONE_API_KEY is required`               | Copy `.env.example` to `.env` and set the key                         |
| `… must be an integer …` / `… true or false` | Fix that variable in `.env` ([configuration](configuration.md))       |
| `Unsupported EMBEDDING_MODEL`                | Use `fast-bge-small-en-v1.5`                                          |
| Git hooks do not run                         | Run `bun install` (sets `core.hooksPath` for this repo)               |
| Commit rejected by commitlint                | Use `type(scope): Sentence-case subject`, header up to 100 characters |
| Commit rejected by cSpell                    | Fix the typo, or add a genuine term to `cspell.json` `words`          |

## Ollama

| Symptom                                  | Fix                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `Ollama is unreachable at …`             | `brew services start ollama`, or check `OLLAMA_HOST`                       |
| `Ollama returned HTTP 404 … ollama pull` | `ollama pull qwen3.5:4b`, or fix `CHAT_MODEL`                              |
| First answer is slow                     | The model is loading; later answers are faster ([Ollama guide](ollama.md)) |
| Everything slows down                    | `ollama ps`: unload other models with `ollama stop <model>`                |

## Pinecone and ingestion

| Symptom                                 | Fix                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `Invalid documents:` list               | Fix each listed manifest entry or file (size, UTF-8, line endings, IDs)   |
| `Namespace "…" is not empty`            | Ingestion is one-shot: `bun run reset-store --yes`, then `bun run ingest` |
| `incomplete ingestion` / doctor shows ✗ | A previous run failed part-way: `bun run reset-store --yes` and re-run    |
| `RecordTooLargeError`                   | A single block is above 38 KB of text; split that part of the file        |
| A scene splits oddly                    | `bun run chunk:preview <file> --verify`; see [chunking](chunking.md)      |

## Answers and the chat page

| Symptom                                     | Fix                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| Red banner                                  | Configuration or Pinecone problem; the banner shows the exact message           |
| Amber banner: Ollama / model                | Start Ollama or pull the model, then click **New chat** to re-check             |
| Amber banner: namespace empty or incomplete | `bun run ingest`, or `bun run reset-store --yes` then ingest                    |
| Answers always say "not found"              | Check `PINECONE_NAMESPACE` is an ingested namespace (`bun run doctor`)          |
| "Unverified citation" warning               | The model cited a number with no source; inspect with `ask --show-prompts`      |
| Wrong scenes retrieved                      | `bun run ask --show-prompts`: compare the search texts and scores (stage 3–4)   |
| "Dropped N older messages" notice           | The chat outgrew `OLLAMA_NUM_CTX`; start a new chat or raise the context window |

## Tests

| Symptom                                     | Fix                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| E2E: `Server did not start`                 | Run `bun run e2e` (it builds first); check nothing else uses port 3100   |
| `Bun.WebView` cannot find a browser (Linux) | Set `BUN_CHROME_PATH` to a Chrome/Chromium binary                        |
| Real-tokenizer tests are skipped            | Expected until the embedding model is cached (run any ingest or preview) |
