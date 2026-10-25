# Getting started

## Prerequisites (macOS on Apple Silicon)

```sh
brew install git gh jq bun node
```

- Bun 1.4.4 or newer runs the app. Node is only needed by some tooling packages (cSpell, commitlint).
- [Ollama](ollama.md), which serves the chat model (on Apple Silicon it runs models with Apple's MLX backend).
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

## Ingest

```sh
bun run ingest                     # data/screenplays -> namespace "screenplays"
bun run doctor                     # shows "Ingestion: N documents, M chunks"
```

Ingestion is one-shot: it refuses a namespace that already holds data. To change documents, reset and ingest again:

```sh
bun run reset-store --yes
bun run ingest
```

The synthetic samples live in their own namespace so they never block your documents:

```sh
SCREENPLAYS_DIR=data/samples PINECONE_NAMESPACE=samples bun run ingest
```

## Ask questions

```sh
bun run ask "Who repairs the engine?"            # one question, streamed answer and sources
bun run ask --verbose                            # interactive chat; --verbose also shows the HyDE passage
PINECONE_NAMESPACE=samples bun run ask "..."     # ask about the synthetic samples
```

## Everyday commands

| Command                        | What it does                                                  |
| ------------------------------ | ------------------------------------------------------------- |
| `bun run dev`                  | Start the app at `http://127.0.0.1:3000`                      |
| `bun run doctor`               | Check config, Ollama, the chat model, embeddings and Pinecone |
| `bun run verify`               | Lint, format check, spelling, type check, unit tests          |
| `bun run format`               | Format TS/JSON/CSS (Biome) and Markdown/YAML (`bun fmt`)      |
| `bun run ingest`               | Validate, chunk, embed and store the documents (one-shot)     |
| `bun run reset-store --yes`    | Delete the namespace's records so you can ingest again        |
| `bun run ask "question"`       | Ask from the terminal; without a question, start a chat       |
| `bun run chunk:preview <file>` | Show how a screenplay is split into scenes and chunks         |
| `bun run e2e`                  | End-to-end tests with `Bun.WebView`                           |

## Optional: spell-check in a container

cSpell normally runs through `bunx`. To run it in Apple's `container` instead (after `container system start`):

```sh
container run --rm -v "$PWD:/workdir" -w /workdir ghcr.io/streetsidesoftware/cspell:latest --no-progress --gitignore .
```
