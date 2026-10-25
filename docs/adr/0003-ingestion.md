# ADR-0003: Ingestion

- **Status:** accepted
- **Date:** 2026-10-25

## Context

Screenplays listed in a manifest must become searchable Pinecone records. Ingestion runs rarely, is one-shot by
requirement (it refuses a store that already holds data), and must never leave a half-ingested store looking complete.

## Decision

### Layering

| Layer                 | Modules                                                | Rules                                  |
| --------------------- | ------------------------------------------------------ | -------------------------------------- |
| Pure (`src/ingest`)   | `manifest.ts`, `prefix.ts`, `records.ts`, the chunker  | No IO, no network, no configuration    |
| Server (`src/server`) | `documents.ts`, `embedder.ts`, `store.ts`, `ingest.ts` | File IO, Fastembed, Pinecone           |
| CLIs (`scripts/`)     | `ingest.ts`, `reset-store.ts`, `doctor.ts`             | Wire configuration to the server layer |

### Flow

1. Load and validate the manifest and every file (size, strict UTF-8, line endings) before any network call; report all
   problems at once.
2. Ensure the index exists (serverless, cosine, `aws/us-east-1`) with the embedder's dimension.
3. **Guard:** refuse if the namespace holds any data.
4. For each document: split into chunks, embed `title + heading + chunk text`, upsert in batches.
5. Write the sentinel record `__ingest__` **last**.

### Records

- **ID:** `${imdbId}:${sceneIndex}:${chunkIndex}` (deterministic, so re-upserts are idempotent).
- **Metadata:** `kind: "chunk"`, `imdb_id`, `title`, `scene_index`, `chunk_index`, `heading` (omitted when null) and
  `text` (exact chunk text). Titles and headings have control characters stripped and are capped at 300 characters.
- **Limits:** metadata at most 38 KB per record (Pinecone allows 40 KB); upsert batches at most 1000 records and 2 MB.
- **Sentinel:** `__ingest__` with `kind: "ingest"`, `completed`, `documents`, `chunks`, `ingested_at` and a unit vector.
  Queries must filter on `kind: "chunk"` because the sentinel can match similarity searches.

### Embedding

The same `embeddingPrefix(title)` function feeds the chunker's token budget and the embedded text, so the 510-token
budget accounts for exactly what is embedded. Fastembed's plain `embed()` is used; `passageEmbed`/`queryEmbed` add
E5-style prefixes that BGE models were not trained with.

### One-shot guard and consistency

The guard checks both `fetch(["__ingest__"])`, which is consistent by ID, and the namespace record count from
`describeIndexStats`, which can lag. Either signal means "not empty". `reset-store --yes` deletes the namespace and
polls until both are empty.

## Consequences

- A failed run leaves records without a sentinel. `doctor` reports it as incomplete, the next ingest refuses, and
  `reset-store --yes` recovers.
- Different namespaces hold independent ingestions: `samples` keeps the synthetic samples for tests, `screenplays`
  (default) holds the owner's documents.
- Changing the embedding model or prefix requires a reset and re-ingest.
