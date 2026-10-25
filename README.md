# Screenplay RAG Chat

A single-user, single-session chat that answers questions about movie screenplays you provide, using
retrieval-augmented generation (RAG). It is a **portfolio project**, not a production system.

- **Runtime:** Bun 1.4.4 (built-ins first: `bun check`, `bun test`, `bun fmt`, `.env` loading, `fetch`)
- **UI:** SolidStart v2 + SolidJS + Tailwind CSS v4
- **Chat LLM:** Ollama with `qwen3.5:4b` (default) or, optionally, MLX `mlx_lm.server`, never both
- **Embeddings:** Fastembed (`fast-bge-small-en-v1.5`, 384 dimensions), run locally
- **Vector store:** Pinecone (managed, free Starter plan)
- **Retrieval:** HyDE (hypothetical document embeddings): one LLM call writes a hypothetical scene, its embedding
  searches Pinecone, a second LLM call answers from the retrieved scenes

## Constraints

- One user, one in-memory chat session (lost on reload or restart)
- Not an agent: it only reads its own data and calls its own models
- Up to 10 user-provided text screenplays, 512 KB each
- Real screenplays are never committed; the repository only holds [synthetic samples](data/samples/README.md)

## Quick start

See [getting started](docs/getting-started.md). In short:

```sh
bun install            # also enables the repo's git hooks
cp .env.example .env   # then set PINECONE_API_KEY
bun run verify         # lint, format, spelling, types, unit tests
bun run dev            # http://127.0.0.1:3000
```

## Documentation

| Topic                                            | Document                                                       |
| ------------------------------------------------ | -------------------------------------------------------------- |
| Getting started                                  | [docs/getting-started.md](docs/getting-started.md)             |
| Architecture                                     | [docs/architecture.md](docs/architecture.md)                   |
| How it works                                     | [docs/how-it-works.md](docs/how-it-works.md)                   |
| RAG applied to this project                      | [docs/rag-in-this-project.md](docs/rag-in-this-project.md)     |
| Screenplay chunking                              | [docs/chunking.md](docs/chunking.md)                           |
| Configuration                                    | [docs/configuration.md](docs/configuration.md)                 |
| Ollama for beginners                             | [docs/ollama.md](docs/ollama.md)                               |
| MLX for beginners                                | [docs/mlx.md](docs/mlx.md)                                     |
| Tidy-up resources                                | [docs/tidy-up.md](docs/tidy-up.md)                             |
| Troubleshooting                                  | [docs/troubleshooting.md](docs/troubleshooting.md)             |
| Limitations                                      | [docs/limitations.md](docs/limitations.md)                     |
| Legal and sample data                            | [docs/legal-and-sample-data.md](docs/legal-and-sample-data.md) |
| Backlog (authoritative; GitHub Issues mirror it) | [docs/backlog.md](docs/backlog.md)                             |
| Architecture decision records                    | [docs/adr/](docs/adr/)                                         |

## Workflow

- Work is tracked in GitHub Issues and Milestones; [docs/backlog.md](docs/backlog.md) is the source of truth.
- One branch per issue (`<type>/<issue>-<slug>`), a pull request into `main`, **rebase merge** only.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) with a sentence-case subject,
  for example `feat(chunker): Add scene heading registry`. The `commit-msg` hook and CI enforce it.
- Git hooks live in `.githooks/` and are enabled per repository by `bun install`
  (`git config --local core.hooksPath .githooks`).
