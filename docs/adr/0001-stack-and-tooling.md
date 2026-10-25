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
| Chat LLM      | Ollama `qwen3.5:4b` (MLX backend on Apple Silicon); single runner, see ADR-0005         |
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

## Spike results (2026-10-25, Linux x64 cloud session, Bun 1.4.4)

### SolidStart v2 + Tailwind on Bun (#6)

- `bun --bun vite dev` serves the app; the Nitro `bun` preset build runs with `bun .output/server/index.mjs`.
- A `"use server"` function runs under Bun in **dev and production**, uses `Bun.env` and `Bun.file`, embeds with
  Fastembed (384 dimensions) and reaches the Pinecone index.
- Native addons cannot be bundled by Rolldown (`UNLOADABLE_DEPENDENCY` on the tokenizers `.node` file). Fix in
  `vite.config.ts`: list `fastembed`, `onnxruntime-node` and `@anush008/tokenizers` in both `ssr.external` and
  `environments.nitro.resolve.external`. The production server then imports them from the project's `node_modules`,
  so it must run from the repository folder (fine for a local app). The Pinecone SDK is bundled.
- Streamed `Response` bodies reach the browser incrementally; Tailwind v4 works with no config file.
- The server binds `127.0.0.1` (`HOST`).
- `Bun.WebView` end-to-end tests pass in dev and production. On Linux, Chrome needs `--no-sandbox` when running as
  root, and tests must wait for hydration before clicking (`data-hydrated` marker) and use timeouts above Bun's 5 s
  default.
- SolidStart declares `engines.node >= 24`; with `bun --bun` the app never uses Node, and the cloud session's Node 22
  did not matter.

### Fastembed (#7)

- `fast-bge-small-en-v1.5` downloads `Qdrant/bge-small-en-v1.5-onnx-Q` to
  `.cache/fastembed/Qdrant_bge-small-en-v1.5-onnx-Q/` (about 5 s first time; no Hugging Face token needed).
- `embed()` returns L2-normalised 384-dimension vectors under Bun.
- `FlagEmbedding.loadTokenizer(dir, 512)` followed by `disableTruncation()` and `disablePadding()` gives exact token
  counts (900 for a 900-word input, so no 512 cap); `encode(text, undefined, { addSpecialTokens: false })` is async.
- Token counts are additive across blocks that end in a line break (19 + 0 = 19 in the probe), as the chunker assumes.
- The tokenizer lower-cases and splits `EXT.` into `ex`, `##t`, `.`.
- `onnxruntime-node`'s blocked postinstall only fetches CUDA binaries; CPU binaries ship in the package.
- Still to confirm on the M1 Mac: the darwin binaries.

### Pinecone Starter (#8)

- Created `rag-screenplays`: serverless, 384 dimensions, cosine, `aws/us-east-1`, ready in about 5 s, deletion
  protection disabled.
- SDK 9 uses option objects: `upsert({ records })`, `fetch({ ids })`, `deleteAll()`.
- At this scale, `fetch` by ID, `query` and `describeIndexStats` all reflected writes and `deleteAll()` immediately.
  The sentinel-plus-stats guard stays, because Pinecone documents eventual consistency for larger writes.
- The `__ingest__` sentinel record is returned by similarity queries, so retrieval must exclude it (metadata filter or
  ID check).
- Still to check: the Starter plan's inactivity/pause policy (console/docs).

### Ollama and Mac checks (#9, 2026-10-25, M1 16 GB, macOS, Ollama 0.40.11)

- `qwen3.5:4b` (4.0 GB download, about 4.5 GB in memory at `num_ctx` 8192) reports capabilities completion, vision,
  thinking and tools, with a 262,144-token maximum context.
- **`think: false` must be sent explicitly.** With `think` omitted, the model thinks by default: a 400-token budget
  went entirely to `message.thinking` (about 1,600 characters) and `content` came back empty.
- With `think: false`: no thinking output, about 41 tokens/s, first load about 2.5 s, warm answers in 1–2 s.
- Streaming is `application/x-ndjson`: one `{ model, created_at, message: { role, content }, done }` object per line,
  the last with `done: true` and `done_reason`.
- Repeated calls with the same `num_ctx` and `keep_alive` reuse the loaded model (`load_duration` about 20 ms). On this
  version a smaller `num_ctx` did not force a reload either; we still send one fixed value.
- Temperature 0.2 and 0.7 both gave grounded answers with `[Title — HEADING]` citations; 0.7 phrases them more
  naturally and remains the default. The model correctly said when the answer was not in the context.
- Fastembed on darwin arm64: tokenizer and ONNX inference work (384 dimensions; 64 short texts in about 7 s including
  warm-up); the real-tokenizer tests run instead of skipping.
- `Bun.WebView` E2E passes on WebKit against the production build.
- `bun run doctor` checks configuration, Ollama, the chat model with `think: false`, the embedding cache and the
  Pinecone index; secrets are redacted.
