# Architecture

The app has two paths that share the same data: **ingestion** (a one-shot CLI that fills Pinecone) and **questions**
(the chat page or the `ask` CLI). Everything runs locally on Bun except Pinecone, which is a managed service.

## Components

```mermaid
flowchart LR
  subgraph Local["Your machine"]
    Browser["Browser<br/>chat page + history"]
    subgraph App["SolidStart on Bun"]
      Routes["src/routes<br/>page, /api/chat, /api/status"]
      Server["src/server<br/>pipeline, clients, config"]
      Rag["src/rag<br/>prompts, citations, history"]
      Ingest["src/ingest<br/>chunker, manifest, records"]
    end
    CLI["scripts/<br/>ingest, ask, doctor, …"]
    Ollama["Ollama<br/>qwen3.5:4b (MLX)"]
    Fastembed["Fastembed<br/>bge-small-en-v1.5"]
  end
  Pinecone[("Pinecone<br/>rag-screenplays")]

  Browser -- "POST /api/chat (NDJSON)" --> Routes
  Routes --> Server
  CLI --> Server
  Server --> Rag
  Server --> Ingest
  Server -- "/api/chat" --> Ollama
  Server --> Fastembed
  Server -- "upsert / query" --> Pinecone
```

## Modules and layering

| Path              | Responsibility                                                                | Rule                                  |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| `src/ingest/`     | Chunker (lines, scenes, blocks, packing), manifest validation, record shape   | Pure: no IO, network or config        |
| `src/rag/`        | Prompts, citation parsing, history fitting, vector blending                   | Pure; safe to import in the browser   |
| `src/lib/`        | Markdown renderer, NDJSON helpers                                             | Client-safe                           |
| `src/server/`     | Config, documents, embedder, Pinecone store and retriever, Ollama, pipeline   | Server-only; never imported by client |
| `src/routes/`     | Chat page and API routes (`/api/chat`, `/api/status`)                         | Routes run on the server              |
| `src/components/` | Chat message and sources UI                                                   | Client components                     |
| `scripts/`        | CLIs: `ingest`, `reset-store`, `ask`, `doctor`, `chunk:preview`, `screenshot` | Wire config to `src/server`           |

The browser bundle contains no server code: the page imports only types from `src/server`, and pure helpers from
`src/rag` and `src/lib`.

## Ingestion flow

```mermaid
sequenceDiagram
  participant C as bun run ingest
  participant D as documents.ts
  participant K as chunker
  participant E as Fastembed
  participant P as Pinecone
  C->>D: load manifest + files (validate all first)
  C->>P: ensure index, refuse if namespace has data
  loop each screenplay
    C->>K: split into scenes, blocks, ~450-token chunks
    C->>E: embed "title + heading + chunk"
    C->>P: upsert records (batched)
  end
  C->>P: write sentinel __ingest__ last
```

Details: [chunking](chunking.md), [ADR-0002](adr/0002-chunking.md), [ADR-0003](adr/0003-ingestion.md).

## Question flow

```mermaid
sequenceDiagram
  participant B as Browser / ask
  participant R as answerQuestion
  participant L as Ollama
  participant E as Fastembed
  participant P as Pinecone
  B->>R: question + history
  R->>L: 1. HyDE prompt (question + last 4 turns)
  L-->>R: imagined scene
  R-->>B: event: hypothesis
  R->>E: embed [query instruction + previous question + question, imagined scene]
  R->>P: query blended vector, top-K, kind = chunk
  P-->>R: chunks
  R-->>B: event: sources
  R->>L: 2. answer prompt (rules + history + numbered excerpts + question)
  L-->>B: events: token… then done
```

Details: [how it works](how-it-works.md), [anatomy of a request](anatomy-of-a-request.md),
[ADR-0004](adr/0004-query-pipeline.md), [ADR-0006](adr/0006-chat-ui.md).

## Data formats

**Manifest** (`${SCREENPLAYS_DIR}/manifest.json`):

```json
[{ "file": "frozen-canyon.txt", "title": "Frozen Canyon (synthetic sample)", "imdbId": "tt0000001", "synthetic": true }]
```

**Pinecone record** (one per chunk; ID `imdbId:sceneIndex:chunkIndex`, 384-dimension vector):

| Metadata      | Example                                           |
| ------------- | ------------------------------------------------- |
| `kind`        | `chunk`                                           |
| `imdb_id`     | `tt0000001`                                       |
| `title`       | `Frozen Canyon (synthetic sample)`                |
| `scene_index` | `0`                                               |
| `chunk_index` | `0`                                               |
| `heading`     | `EXT. FROZEN CANYON - TWILIGHT` (omitted if none) |
| `text`        | the exact chunk text                              |

**Sentinel** `__ingest__`: `kind: ingest`, `completed`, `documents`, `chunks`, `ingested_at`. Written last; its
presence means the namespace holds a complete ingestion.

**`/api/chat` stream** (NDJSON, one event per line):

```json
{"type":"hypothesis","text":"EXT. FROZEN CANYON - NIGHT\n\n…"}
{"type":"sources","chunks":[{"id":"tt0000001:0:0","score":0.58,"title":"…","heading":"…","text":"…"}]}
{"type":"token","text":"The old droid "}
{"type":"done","answer":"The old droid … [1].","charsPerToken":3.1}
```

Other events: `history-trimmed` (older turns dropped to fit the context window) and `error`.

## Decisions

[ADR-0001](adr/0001-stack-and-tooling.md) stack and tooling · [ADR-0002](adr/0002-chunking.md) chunking ·
[ADR-0003](adr/0003-ingestion.md) ingestion · [ADR-0004](adr/0004-query-pipeline.md) query pipeline ·
[ADR-0005](adr/0005-single-llm-runner.md) single LLM runner · [ADR-0006](adr/0006-chat-ui.md) chat UI
