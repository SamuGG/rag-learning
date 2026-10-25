# Getting started

## Prerequisites (macOS on Apple Silicon)

```sh
brew install git gh jq bun node
```

- Bun 1.4.4 or newer runs the app. Node is only needed by some tooling packages (cSpell, commitlint).
- A chat model server: [Ollama](ollama.md) (default) **or** [MLX](mlx.md) (optional, from milestone M6). Run one,
  never both: two 4B models compete for 16 GB of memory.
- A free [Pinecone](https://app.pinecone.io/) account and API key.

## Set up

```sh
git clone https://github.com/SamuGG/rag-learning.git
cd rag-learning
bun install                     # installs dependencies and enables .githooks for this repo only
cp .env.example .env            # set PINECONE_API_KEY
git config --local pull.rebase true
```

`bun install` runs `git config --local core.hooksPath .githooks`. Nothing is written to your global git config.

## Pull the chat model

```sh
ollama pull qwen3.5:4b
```

See [Ollama for beginners](ollama.md) if you have never used it.

## Add your screenplays

1. Put up to 10 plain-text screenplays (512 KB maximum each) in `data/screenplays/` (git-ignored).
2. Create `data/screenplays/manifest.json`:

   ```json
   [{ "file": "my-film.txt", "title": "My Film", "imdbId": "tt1234567" }]
   ```

To try the pipeline without your own documents, set `SCREENPLAYS_DIR=data/samples`.

## Everyday commands

| Command                        | What it does                                             |
| ------------------------------ | -------------------------------------------------------- |
| `bun run dev`                  | Start the app at `http://127.0.0.1:3000`                 |
| `bun run verify`               | Lint, format check, spelling, type check, unit tests     |
| `bun run format`               | Format TS/JSON/CSS (Biome) and Markdown/YAML (`bun fmt`) |
| `bun run chunk:preview <file>` | Show how a screenplay is split into scenes and chunks    |
| `bun run e2e`                  | End-to-end tests with `Bun.WebView`                      |

Ingestion (`bun run ingest`) and the `ask` CLI arrive in milestones M2 and M3.
