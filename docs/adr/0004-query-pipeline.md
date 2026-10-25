# ADR-0004: Query pipeline

- **Status:** accepted
- **Date:** 2026-10-25

## Context

Each question must be answered from the ingested screenplays by a small local model (`qwen3.5:4b`, 8192-token
context), with exactly two LLM calls per request, the full conversation history, and excerpts labelled with film title
and scene heading.

## Decision

```mermaid
sequenceDiagram
  participant U as User
  participant P as answerQuestion
  participant L as ChatModel (Ollama)
  participant E as Fastembed
  participant S as Pinecone
  U->>P: question + history
  P->>L: 1. HyDE: question + last 4 turns
  L-->>P: hypothetical scene (≤ 256 tokens)
  P->>E: embed question (as a query) + passage, average
  P->>S: top-K, filter kind = chunk
  S-->>P: chunks
  P->>L: 2. answer: rules + full history + labelled excerpts + question (streamed)
  L-->>U: tokens, then sources
```

- **Layering:** prompts and history fitting are pure (`src/rag/`); the Ollama client, retriever and orchestration are
  server-only (`src/server/`). `answerQuestion` yields events (`hypothesis`, `sources`, `history-trimmed`, `token`,
  `done`) that both the `ask` CLI and the M4 UI consume.
- **`ChatModel` interface:** `generate` and `stream`. `createChatModel(config)` returns the Ollama implementation; the
  interface keeps the pipeline testable with a fake model. Ollama is the only runner ([ADR-0005](0005-single-llm-runner.md)).
- **Ollama calls:** `fetch` to `/api/chat`; every call sends `think: false` (configurable), the same `num_ctx` and
  `keep_alive`, so the model is never reloaded between the two calls. Streaming is NDJSON; `message.thinking` is
  ignored.
- **HyDE:** the hypothetical passage is written in screenplay form, 80–150 words, with the last four turns so follow-up
  questions stay anchored. The prompt tells the model to keep the people, places and objects the question names and
  not to invent new names.
- **Follow-ups:** the search query is the previous user question plus the current one, so "Does their plan work?"
  still carries "the mining outpost".
- **Search vector:** the question, prefixed with BGE's query instruction (`Represent this sentence for searching
relevant passages: `), and the hypothetical passage are embedded in one call and averaged, then re-normalised. Like
  the original HyDE method, which includes the query among the encoded texts, this keeps the search close to what was
  asked when the hypothesis drifts.
- **Retrieval:** Pinecone top-K (`TOP_K`, default 5) with `filter: { kind: { $eq: "chunk" } }` to exclude the
  ingestion sentinel.
- **Answer prompt:** system rules (excerpts only, with reasonable inferences worded as such; resolve "they"/"it" from
  the conversation; cite by excerpt number; say "not found" only when there is no direct or inferable evidence;
  summarise rather than copy; be concise), then the full history, then a final user message with the excerpts. Each excerpt is numbered and
  prefixed with film title and scene heading: `[1] Title — HEADING`.
- **Numbered citations:** the model cites `[1]`, `[1][2]` or `[1, 2]`; small models copy short numbers reliably, while
  they shortened or invented long `[Title — HEADING]` labels in testing. The answer text is kept as generated; the CLI
  (and later the UI) lists the numbered sources below it, marks the cited ones, and warns about numbers that match no
  excerpt (`unmatchedCitations`).
- **History:** assistant answers are stored with `[n]` replaced by `(Title — HEADING)` (`resolveCitations`), because
  the next question numbers its excerpts afresh.
- **History guard:** history is sent in full. Only if the estimated prompt would exceed `num_ctx − 1024` tokens are the
  oldest user/assistant pairs dropped, and the caller is told. Tokens are estimated as characters ÷ 3, recalibrated
  after each answer from Ollama's `prompt_eval_count`.

## Evidence (synthetic samples, 2 scenes)

On the Mac, the question "Who is trying to fix the engine, and how hopeful are they?" produced a drifted hypothesis
(an invented garage and character) and the answer cited `[Frozen Canyon — …]` instead of the full label. Scores for the
right scene versus the other one, using that same hypothesis:

| Search vector                                | Canyon | Outpost | Gap   |
| -------------------------------------------- | ------ | ------- | ----- |
| Hypothesis only (original)                   | 0.501  | 0.489   | 0.012 |
| Plain question only                          | 0.490  | 0.481   | 0.009 |
| Question with query instruction only         | 0.478  | 0.442   | 0.036 |
| Plain question + hypothesis                  | 0.555  | 0.544   | 0.011 |
| Question with query instruction + hypothesis | 0.556  | 0.529   | 0.027 |

With the blended search, a second Mac run scored 0.586 versus 0.555 (gap 0.031), but the model invented a label
(`[Old Droid repairs frozen engine — …]`) instead of copying it, which led to numbered citations.

A sequential test then asked "What happens at the mining outpost?" followed by "Does their plan work?". The answer
was grounded but too literal: it ignored "An alarm blares." as evidence and dragged in the droid scene. Allowing
marked inferences and resolving references addressed the answer; adding the previous question to the search query
moved retrieval for the follow-up from 0.408 vs 0.393 to 0.644 vs 0.453 in favour of the outpost scene.

Two short, similar scenes give small margins whatever the method; the evaluation set (later backlog) will measure this
properly on real screenplays.

## Consequences

- Two sequential LLM calls add latency (about 1–2 s each warm on the M1), offset by streaming the answer.
- A poor hypothetical passage retrieves poor scenes; the evaluation set (later backlog) will measure this.
- The answer quality is bounded by a 4B model; the prompt keeps it grounded and makes "not found" an explicit option.
