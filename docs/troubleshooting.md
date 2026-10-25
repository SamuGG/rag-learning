# Troubleshooting

> Grows as issues are found; completed in milestone M5.

| Symptom                                     | Fix                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `PINECONE_API_KEY is required`              | Copy `.env.example` to `.env` and set the key                             |
| Commit rejected by `commitlint`             | Use `type(scope): Sentence-case subject`, header up to 100 characters     |
| Commit rejected by cSpell                   | Fix the typo or add a genuine term to `cspell.json` `words`               |
| Hooks do not run                            | Run `bun install` (sets `core.hooksPath` for this repo)                   |
| `Bun.WebView` cannot find a browser (Linux) | Set `BUN_CHROME_PATH` to a Chrome/Chromium binary                         |
| Ollama or MLX problems                      | See [Ollama](ollama.md) or [MLX](mlx.md)                                  |
| `Namespace "…" is not empty`                | Ingestion is one-shot: `bun run reset-store --yes`, then `bun run ingest` |
| `incomplete ingestion` / doctor shows ✗     | A previous run failed part-way: `bun run reset-store --yes` and re-run    |
| `Invalid documents:` list                   | Fix each listed manifest entry or file (size, UTF-8, line endings, IDs)   |
| `RecordTooLargeError`                       | A single block is above 38 KB of text; split that part of the file        |
