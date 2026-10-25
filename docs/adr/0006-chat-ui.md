# ADR-0006: Chat UI

- **Status:** accepted
- **Date:** 2026-10-25

## Context

The chat page must stream answers, show which scenes they came from, keep the conversation only for the current
session, and surface problems (Ollama down, empty namespace, missing configuration) without a terminal.

## Decision

- **Transport:** a plain API route, `POST /api/chat`, streams the pipeline's events (`hypothesis`, `sources`,
  `history-trimmed`, `token`, `done`, `error`) as NDJSON. `GET /api/status` reports configuration, Ollama reachability,
  the model and the namespace's ingestion state. A route is simpler to stream, abort and test than a server function,
  and reuses the same NDJSON helpers as the Ollama client (`src/lib/ndjson.ts`).
- **State:** the conversation lives in a Solid store in the browser and is sent with each request; the server is
  stateless. Answers are stored for history with `[n]` resolved to `(Title — HEADING)`. "New chat" clears it, as does
  a reload.
- **Rendering:** a small, dependency-free Markdown subset (`src/lib/markdown.ts`) escapes all HTML first, then formats
  bold, italic, code, lists and paragraphs, and turns `[n]` into links to the numbered sources. Unknown numbers are
  shown as unverified.
- **Sources:** each answer has a collapsible list of the retrieved scenes (label, score, excerpt) and the HyDE search
  passage; cited sources are highlighted and clicking a citation opens the list.
- **Abort:** "Stop" aborts the fetch; the request signal reaches the Ollama calls, so generation stops too.
- **Fake services:** `FAKE_SERVICES=true` swaps in a canned model, a constant embedder and a retriever over the
  synthetic samples (`src/server/fake-services.ts`), so the UI and its end-to-end tests run without Ollama, Fastembed
  or Pinecone. A question containing "simulate an error" makes the fake model fail.
- **Status fetch:** the page fetches `/api/status` only in the browser (`isServer` guard), never during server
  rendering.

## Consequences

- End-to-end tests (`bun run e2e`) drive the production build through `Bun.WebView` with fake services; WebKit on
  macOS, Chromium on Linux (`--no-sandbox` when running as root).
- The client bundle contains no server code (checked: no config, Pinecone or Fastembed code under `.output/public`).
- The Markdown renderer covers what the model produces in practice; anything else shows as plain text.
