# How it works

This is the narrative version: what happens to your screenplays, and what happens when you ask a question. For the
exact prompts and artefacts of one real question, see [anatomy of a request](anatomy-of-a-request.md); for the
reasoning behind each choice, see [retrieval design](retrieval-design.md).

## 1. Ingestion: screenplays become searchable chunks

You list up to 10 screenplays in `manifest.json` and run `bun run ingest`.

1. **Validate everything first.** The manifest (paths, titles, IMDB-style IDs) and every file (size, UTF-8, line
   endings) are checked before anything touches the network. All problems are reported together.
2. **Refuse a non-empty store.** Ingestion is one-shot: if the Pinecone namespace already holds data, it stops and
   tells you to run `bun run reset-store --yes`.
3. **Split into scenes.** Scene headings (`INT. HOUSE - DAY`, `EXT./INT. CAR`…) start scenes; transitions such as
   `CUT TO:` end them. Text before the first heading is kept as a preamble.
4. **Split scenes into blocks.** Action paragraphs, transitions and **dialogue blocks** (a character cue with its
   parentheticals and speech) are indivisible.
5. **Pack blocks into chunks.** Short scenes become one chunk. Long scenes are packed into chunks of about 450 tokens,
   counted with the embedding model's own tokenizer, each starting with up to 100 tokens of whole blocks from the
   previous chunk (semantic overlap). Chunk text is always an exact slice of your file.
6. **Embed.** Each chunk is embedded locally with Fastembed as `title + scene heading + chunk text`, a 384-number
   vector that captures its meaning.
7. **Store.** Each vector goes to Pinecone with metadata: film, scene and chunk numbers, heading and the exact text.
   A sentinel record written last marks the ingestion as complete.

Example: the sample `frozen-canyon.txt` is one short scene, so it becomes one chunk,
`tt0000001:0:0`, headed `EXT. FROZEN CANYON - TWILIGHT`.

## 2. A question: two model calls and a search

You ask "Who is trying to fix the engine, and how hopeful are they?" in the chat page or with `bun run ask`.

1. **Imagine a scene (LLM call 1, HyDE).** The model writes a short screenplay-style passage that could contain the
   answer. Questions don't look like screenplay text; an imagined scene does, so it searches better.
2. **Search.** Two texts are embedded and averaged into one search vector:
   - the question, prefixed with the instruction the BGE model expects for queries (and, for a follow-up, preceded by
     your previous question, so "Does their plan work?" still means the smugglers);
   - the imagined scene.

   Pinecone returns the top 5 most similar chunks (by cosine similarity), ignoring the sentinel record.

3. **Answer (LLM call 2).** The model receives:
   - rules: use only the excerpts, infer carefully and say so, cite by number, say "not found" only without evidence;
   - the conversation so far;
   - the excerpts, numbered and labelled: `[1] Frozen Canyon (synthetic sample) — EXT. FROZEN CANYON - TWILIGHT`;
   - your question.

   It streams back an answer such as "The old droid repairs the engine, and it has no optimism [1]."

4. **Show it.** The page renders the answer, turns `[1]` into a link to the numbered source, flags any citation that
   matches no source, and lists the sources with their scores, excerpts and the imagined scene.

## 3. The conversation

- The conversation lives only in your browser tab (or the `ask` session) and is sent with each question; the server
  keeps nothing. **New chat**, a reload or a restart clears it.
- Stored answers have their `[1]` citations replaced by the scene label, because the next question numbers its
  excerpts afresh.
- The full history is sent unless it would overflow the model's 8192-token context window; then the oldest
  question/answer pairs are dropped and you see a notice.

## Where to look in the code

| Step                    | Code                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| Validation and loading  | `src/ingest/manifest.ts`, `src/server/documents.ts`                     |
| Chunking                | `src/ingest/` (`scenes.ts`, `blocks.ts`, `pack.ts`, `chunker.ts`)       |
| Embedding and storage   | `src/server/embedder.ts`, `src/server/store.ts`, `src/server/ingest.ts` |
| The question pipeline   | `src/server/rag.ts` (`answerQuestion`)                                  |
| Prompts and search text | `src/rag/prompts.ts`                                                    |
| Citations and history   | `src/rag/citations.ts`, `src/rag/history.ts`                            |
| Chat page and streaming | `src/routes/index.tsx`, `src/routes/api/chat.ts`, `src/components/`     |
