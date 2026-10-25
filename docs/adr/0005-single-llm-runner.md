# ADR-0005: Single LLM runner (Ollama)

- **Status:** accepted
- **Date:** 2026-10-25
- **Supersedes:** the optional MLX provider planned as milestone M6 (#24) in ADR-0001 and ADR-0004

## Context

The plan kept MLX (`mlx_lm.server`) as an optional alternative chat runner, selected by `LLM_PROVIDER`, because MLX
was expected to be faster than Ollama on Apple Silicon.

While comparing models on the M1 (16 GB), `ollama ps` showed `RUNNER mlx` for both `qwen3.5:4b` and `gemma4:e4b`:
Ollama already runs these models on Apple's MLX backend. The speed advantage that motivated a second runner is
therefore already available through Ollama.

## Decision

- **Ollama is the only chat runner.** No `LLM_PROVIDER` switch, no `MlxChatModel`, no `MLX_HOST`.
- Model choice stays a configuration value (`CHAT_MODEL`), so trying another model needs no code change.
- The `ChatModel` interface remains: it keeps the RAG pipeline testable with a fake model and isolates Ollama's API.
- `docs/mlx.md` was kept briefly as a standalone MLX reference and removed in M5, since nothing in the app uses it.

## Model comparison behind this decision (M1, 16 GB, samples namespace)

| Model        | Memory (16K context) | Grounded | Cites `[1]` | Says "not found" | Notes                     |
| ------------ | -------------------- | -------- | ----------- | ---------------- | ------------------------- |
| `qwen3.5:4b` | 4.1 GB               | yes      | yes         | yes              | Fullest answers; default  |
| `gemma4:e4b` | 9.4 GB               | yes      | yes         | yes              | Tersest; twice the memory |
| `llama3.2`   | not measured         | yes      | no          | yes              | Ignored the citation rule |

## Consequences

- Milestone M6 and issue #24 are closed as not planned.
- One runner to install, document and troubleshoot.
- Models that only exist as `mlx-community` checkpoints (not packaged for Ollama) cannot be used without revisiting
  this decision.
