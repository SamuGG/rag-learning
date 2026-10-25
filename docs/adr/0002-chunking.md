# ADR-0002: Screenplay chunking

- **Status:** accepted (D5–D7 proposed, pending owner review)
- **Date:** 2026-10-25

## Context

Retrieval quality depends on chunks that are meaningful on their own. Screenplays have strong structure (scene headings,
dialogue blocks, transitions) but exports vary. The source text must be preserved exactly, and the embedding model
(`bge-small-en-v1.5`) reads at most 512 tokens.

## Decision

Split by **scene**, then pack **indivisible blocks** into chunks of about **450 tokens including 50–100 tokens of
semantic overlap**, measured with the **embedding model's own tokenizer**. Chunk text is always an exact source slice.
See [chunking](../chunking.md) for the algorithm.

| #   | Situation                                         | Behaviour                                                                  | Status    |
| --- | ------------------------------------------------- | -------------------------------------------------------------------------- | --------- |
| D1  | Text after a closing transition, before an opener | New segment with `heading: null` (page furniture and transitions excluded) | confirmed |
| D2  | Text before the first heading                     | Indexed as a preamble with `heading: null`                                 | confirmed |
| D3  | A unit larger than the target                     | Kept intact; warnings for oversized and truncated chunks                   | confirmed |
| D4  | Tail chunk adds fewer than 50 new tokens          | Merged into the previous chunk if it fits the embedding budget             | confirmed |
| D5  | Bodiless segment                                  | Only transition/terminator segments and blank preambles merge              | proposed  |
| D6  | `heading` value                                   | Only scene headings set it; transition openers give `null`                 | proposed  |
| D7  | Exports without blank lines                       | A cue line after other text starts a new paragraph                         | proposed  |

## Rationale

- **Scenes, not fixed windows:** a scene is the unit a question usually targets ("what happens in the canyon?"), and
  never mixing scenes keeps the `[Title — HEADING]` citation truthful.
- **Blocks, not characters:** dialogue split mid-speech loses its speaker; cutting mid-sentence hurts both embedding
  and answer quality.
- **Same tokenizer as the embedder:** a 450-token target only means something if it is counted the way the model
  counts. Additivity across line-terminated blocks makes counting each block once exact.
- **450 + overlap inside the target:** leaves about 60 tokens for the title/heading prefix and special tokens within
  the 512-token window.
- **Overlap of whole blocks:** repeats meaningful context (usually the last exchange) instead of a blind token tail.
- **Rule objects, not one regex:** recognition is explicit, testable line by line, and extensible.

## Consequences

- Chunks can exceed 450 tokens: a lone oversized block (D3) or a merged tail (D4, up to the embedding budget).
- Overlap can be below 50 tokens, or absent, when block sizes do not allow more without cutting a unit.
- Parsing is heuristic; known misses are listed in [chunking](../chunking.md#known-limitations).
- `@anush008/tokenizers` is pinned to `0.0.0`, the exact version Fastembed 3 depends on, so both use the same
  native build.
