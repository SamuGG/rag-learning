# Limitations

## By design

- Portfolio and learning project: no authentication, no multi-user support, binds to `127.0.0.1` only.
- One chat session, held in the browser (or the `ask` session); reloading or restarting loses it.
- Up to 10 plain-text screenplays of 512 KB each.
- Ingestion is one-shot per namespace: reset to re-ingest.
- Production (`bun run start`) must run from the repository folder, because the native embedding libraries are loaded
  from `node_modules` rather than bundled.
- End-to-end tests run locally only; CI runs lint, types, spelling and unit tests.

## Models and retrieval

- The English-only embedding model (`bge-small-en-v1.5`) reads 512 tokens; longer chunks are truncated when embedded
  (the full text is still stored and shown).
- A 4B chat model: the imagined scene (HyDE) often drifts to invented places and people, and inferences can be too
  cautious or too bold. The blended search and the prompt rules reduce this but don't remove it.
- With only the two synthetic samples, retrieval margins are small (a few hundredths); they say little about
  performance on real screenplays. The evaluation set ([#26](https://github.com/SamuGG/rag-learning/issues/26)) would
  measure it properly.
- Citations are checked for valid numbers, not for whether the cited scene really supports the sentence.
- Answers can be slow on a 16 GB machine: two model calls per question.

## Parsing

Screenplay parsing is heuristic; see the known limitations in [chunking](chunking.md#known-limitations).
