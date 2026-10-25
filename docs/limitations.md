# Limitations

- Portfolio project: no authentication, no multi-user support, binds to `127.0.0.1` only.
- One chat session held in the browser; reloading or restarting loses it.
- Up to 10 text screenplays of 512 KB each; plain text only.
- Ingestion is one-shot: reset the store to re-ingest.
- English-only embedding model (`bge-small-en-v1.5`), 512-token window.
- A 4B local model can misread context or answer slowly on 16 GB machines.
- Screenplay parsing is heuristic; see the known limitations in [chunking](chunking.md).
