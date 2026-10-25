# Architecture

> Skeleton; completed in milestone M5.

```mermaid
flowchart LR
  subgraph Ingestion [Ingestion CLI]
    M[manifest.json] --> P[Chunker: scenes, blocks, chunks]
    P --> E[Fastembed embed]
    E --> S[(Pinecone)]
  end
  subgraph Chat [SolidStart app on Bun]
    U[Browser: chat + history signal] --> F[Server function]
    F --> H[LLM: HyDE passage]
    H --> E2[Fastembed embed]
    E2 --> S
    S --> A[LLM: answer with scene context]
    A --> U
  end
```

## Modules

| Path          | Responsibility                                                   |
| ------------- | ---------------------------------------------------------------- |
| `src/ingest/` | Pure screenplay chunker (no network, no config)                  |
| `src/server/` | Server-only code: configuration, embedder, Pinecone, LLM clients |
| `src/routes/` | SolidStart pages and server functions                            |
| `scripts/`    | CLIs: chunk preview, ingest, reset store, doctor, ask            |

Decisions are recorded in [ADRs](adr/).
