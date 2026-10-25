# ADR-0001: Stack and tooling

- **Status:** accepted
- **Date:** 2026-10-25

## Context

A single-developer portfolio project: a local RAG chat over user-provided screenplays on an M1 Mac with 16 GB of
memory. The goal is to learn RAG end to end with a small, modern TypeScript stack and to lean on Bun's built-ins.

## Decision

| Concern       | Choice                                                                                  |
| ------------- | --------------------------------------------------------------------------------------- |
| Runtime       | Bun 1.4.4 only. Node is installed solely because some tooling packages require it.      |
| Type checking | `bun check --no-script` (replaces `tsc --noEmit`)                                       |
| Tests         | `bun test`; end-to-end tests drive `Bun.WebView` (WebKit on macOS, Chromium on Linux)   |
| Linting       | Biome 2.6 (Bun has no linter)                                                           |
| Formatting    | Biome for TS/JSON/CSS (editor format-on-save); `bun fmt` for Markdown and YAML          |
| Spelling      | cSpell, British English; US spelling also accepted in code                              |
| Commits       | Conventional Commits enforced by commitlint in a repo-level `commit-msg` hook and CI    |
| UI            | SolidStart v2 (Vite 8, Nitro 3 `bun` preset), SolidJS, Tailwind CSS v4 (no config file) |
| Chat LLM      | Ollama `qwen3.5:4b` by default; MLX `mlx_lm.server` as an optional alternative (M6)     |
| Embeddings    | Fastembed 3 `fast-bge-small-en-v1.5` (384 dimensions, 512-token window), no fallback    |
| Vector store  | Pinecone serverless, free Starter plan, `aws/us-east-1`                                 |
| Git workflow  | Issues and Milestones; branch per issue; PRs into `main`; rebase merges only            |

## Consequences

- No script may be named `check` or `fmt`: `bun check` and `bun fmt` would run the script instead of the tool.
- Each file has exactly one formatter, so Biome and `bun fmt` never fight.
- SolidStart v2 is in maintenance mode; acceptable for a portfolio project, revisit if Solid 2 ships a successor.
- Fastembed uses native `onnxruntime-node` and `@anush008/tokenizers` binaries (linux-x64 and darwin-universal only),
  so the app cannot run in a Linux arm64 container.
- Fastembed's `passageEmbed`/`queryEmbed` add E5-style prefixes; we use plain `embed()` for BGE.

## Spike results

Recorded by issues #6 (SolidStart on Bun), #7 (Fastembed) and #8 (Pinecone). Ollama (#9) is verified on the Mac.
