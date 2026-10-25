# Troubleshooting

> Grows as issues are found; completed in milestone M5.

| Symptom                                     | Fix                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `PINECONE_API_KEY is required`              | Copy `.env.example` to `.env` and set the key                          |
| Commit rejected by `commitlint`             | Use `type(scope): Sentence-case subject`, header up to 100 characters  |
| Commit rejected by cSpell                   | Fix the typo or add a genuine term to `cspell.json` `words`            |
| Hooks do not run                            | Run `bun install` (sets `core.hooksPath` for this repo)                |
| Hooks fail from the VS Code Git panel       | Ensure Homebrew is in `/opt/homebrew/bin` (the hooks add it to `PATH`) |
| `Bun.WebView` cannot find a browser (Linux) | Set `BUN_CHROME_PATH` to a Chrome/Chromium binary                      |
| Ollama or MLX problems                      | See [Ollama](ollama.md) or [MLX](mlx.md)                               |
