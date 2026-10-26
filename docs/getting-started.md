# Getting started

From a fresh clone to asking questions, in order. Commands assume macOS on Apple Silicon.

## 1. Prerequisites

```sh
brew install git gh jq bun node ollama
```

- **Bun** 1.4.4 or newer runs the app. **Node** is only needed by some tooling packages (cSpell, commitlint).
- **Ollama** serves the chat model; on Apple Silicon it runs models with Apple's MLX backend. New to it? Read
  [Ollama for beginners](ollama.md).
- A free **Pinecone** account and API key from the [Pinecone console](https://app.pinecone.io/).

## 2. Clone and install

```sh
git clone https://github.com/SamuGG/rag-learning.git
cd rag-learning
bun install                       # dependencies + git hooks for this repo only
git config --local pull.rebase true
cp .env.example .env              # then set PINECONE_API_KEY
```

`bun install` runs `git config --local core.hooksPath .githooks`; nothing is written to your global git config. Every
setting is described in [configuration](configuration.md).

## 3. Start Ollama and pull the model

```sh
brew services start ollama
ollama pull qwen3.5:4b
```

## 4. Check everything

```sh
bun run doctor
```

It checks the configuration, Ollama and the chat model, the embedding model cache and the Pinecone index, and says
what to fix. A "namespace is empty" warning is expected before ingesting.

## 5. Ingest documents

**Try the samples first.** They go into their own namespace so they never block your documents:

```sh
SCREENPLAYS_DIR=data/samples PINECONE_NAMESPACE=samples bun run ingest
```

**Then your own screenplays:**

1. Put up to 10 plain-text screenplays (512 KB maximum each) in `data/screenplays/` (git-ignored).
2. Create `data/screenplays/manifest.json`:

   ```json
   [{ "file": "my-film.txt", "title": "My Film", "imdbId": "tt1234567" }]
   ```

3. Preview how one splits (optional), then ingest:

   ```sh
   bun run chunk:preview data/screenplays/my-film.txt --verify
   bun run ingest                  # data/screenplays -> namespace "screenplays"
   ```

Ingestion is one-shot. To change documents: `bun run reset-store --yes`, then `bun run ingest` again.

## 6. Ask questions

In the browser:

```sh
bun run dev                                   # your documents, http://127.0.0.1:3000
PINECONE_NAMESPACE=samples bun run dev        # the samples
FAKE_SERVICES=true bun run dev                # the UI without Ollama or Pinecone
```

The header shows the model, the namespace and how many documents are ingested; banners explain anything that stops
answers. Answers stream in, cite scenes as `[1]` and list their sources below. **Stop** interrupts an answer and
**New chat** clears the conversation.

In the terminal:

```sh
bun run ask "Who repairs the engine?"                       # one question
bun run ask --verbose                                       # interactive chat, shows the HyDE passage
PINECONE_NAMESPACE=samples bun run ask --show-prompts       # every stage of each request
```

`--show-prompts` is the easiest way to learn how a request works; [anatomy of a request](anatomy-of-a-request.md)
walks through its output.

## 7. Develop

```sh
bun run verify        # lint, format check, spelling, type check, unit tests (also run in CI)
bun run e2e           # build, then end-to-end tests with fake services (WebKit on macOS)
bun run format        # format TS/JSON/CSS (Biome) and Markdown/YAML (bun fmt)
bun run screenshot    # build, then regenerate docs/images/chat.png
```

Commits must follow Conventional Commits with a sentence-case subject (`feat(ui): Add sources panel`); the
`commit-msg` hook checks it, along with spelling.
