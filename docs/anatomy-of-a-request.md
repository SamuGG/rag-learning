# Anatomy of a request

One question, then a follow-up, traced through every stage of the pipeline with the real artefacts: the prompts the
model receives, the texts that are embedded, the scores Pinecone returns and the answer that comes back. Read it with
[how it works](how-it-works.md) for the overview and [retrieval design](retrieval-design.md) for the reasons.

> **Try it yourself.** Ingest the samples once, then trace any question:
>
> ```sh
> SCREENPLAYS_DIR=data/samples PINECONE_NAMESPACE=samples bun run ingest
> PINECONE_NAMESPACE=samples bun run ask --show-prompts
> ```
>
> Type the questions below one after the other; `--show-prompts` prints stages 1 to 6 for each.

**Setup for this trace:** namespace `samples` (two synthetic scenes), `qwen3.5:4b` through Ollama, `TOP_K=5`,
`OLLAMA_NUM_CTX=8192`. Model outputs (stages 2 and 6) vary between runs; everything else is deterministic for a given
model output.

<!-- MODEL-OUTPUT-PENDING: stages 2, 4 and 6 are filled from a real `ask --show-prompts` run on the Mac. -->

---

## Question 1: "Who is trying to fix the engine, and how hopeful are they?"

### Stage 1. The HyDE prompt (LLM call 1)

Code: `hydeMessages` in `src/rag/prompts.ts`.

```text
[system]
You write short, plausible screenplay excerpts.
Given a question about films in a collection, write the kind of scene that would contain the answer:
a scene heading, a few lines of action and some dialogue, 80 to 150 words in total.
Keep the people, places, objects and events named in the question and the conversation; use their exact names.
Do not invent new character names or locations unless the question gives none.
Output only the passage. No explanations, no title, no notes.

[user]
Question: Who is trying to fix the engine, and how hopeful are they?
```

**Why:** a question doesn't look like a screenplay; an imagined scene does. There is no conversation yet, so only the
question is sent. The call is capped at 256 tokens and sent with `think: false`.

### Stage 2. The imagined scene (output of call 1)

```text
(pending: real qwen3.5:4b output)
```

**What to notice:** the question names no people or places, so the model is free to invent them, and usually does.
That drift is why the next stage doesn't rely on this text alone.

### Stage 3. The search texts

Code: `searchQuery` in `src/rag/prompts.ts`, `answerQuestion` in `src/server/rag.ts`.

```text
[text 1]
Represent this sentence for searching relevant passages: Who is trying to fix the engine, and how hopeful are they?

[text 2]
(the imagined scene from stage 2)
```

Each text becomes a vector of 384 numbers with Fastembed. For text 1 the first six are
`-0.0268, 0.0161, 0.0022, 0.0079, 0.0120, -0.0473` and its length (norm) is 1. The two vectors are averaged and
normalised again (`blendVectors` in `src/rag/vectors.ts`) into the single search vector.

**Why:** the instruction prefix is what the BGE model expects for short search queries; the imagined scene adds
screenplay-shaped wording. The blend keeps the search anchored to the question even if the scene drifts. Text 1 is 22
tokens; the canyon scene it should find is 54.

### Stage 4. What Pinecone returns

Code: `createPineconeRetriever` in `src/server/retriever.ts` (top-K with `filter: { kind: { $eq: "chunk" } }`).

```text
(pending: real scores from the run)
```

**What to notice:** with only two scenes both are always returned (TOP_K is 5); what matters is the order and the
gap. Scores are cosine similarities, so only their ranking is meaningful. The filter keeps the ingestion sentinel out
of the results.

### Stage 5. The answer prompt (LLM call 2)

Code: `answerMessages` and `formatExcerpts` in `src/rag/prompts.ts`. Excerpts appear in the order retrieved.

```text
[system]
You answer questions about movie screenplays using only the scene excerpts provided with each question.
Rules:
- Base every statement on the excerpts. You may draw reasonable inferences from what they show, and say so (for
  example: "the alarm suggests the plan fails [2]"). Never use outside knowledge about the films or invent details.
- Use the conversation to work out what the question refers to (who "they" or "it" are), and answer only about that.
- Cite the excerpts you rely on by their number in square brackets, for example [1] or [1][2]. Never put titles or
  headings inside brackets.
- Say that you could not find the answer in the provided screenplays only when the excerpts give no direct or
  inferable evidence.
- Summarise instead of copying; quote at most a short line of dialogue.
- Be concise.

[user]
Scene excerpts:

[1] Frozen Canyon (synthetic sample) — EXT. FROZEN CANYON - TWILIGHT
EXT. FROZEN CANYON - TWILIGHT

A battered freighter rests in the snow. A YOUNG PILOT scans the horizon while an OLD DROID repairs a frozen engine.

YOUNG PILOT

Tell me that's the last broken part.

OLD DROID

Optimism is not included in my programming.

---

[2] Asteroid Outpost (synthetic sample) — EXT. ASTEROID MINING OUTPOST - DAY
EXT. ASTEROID MINING OUTPOST - DAY

Cargo lifts rumble overhead. Two SMUGGLERS crouch behind fuel crates.

FIRST SMUGGLER

We sneak in quietly.

SECOND SMUGGLER

You say that every time.

An alarm blares.

Question: Who is trying to fix the engine, and how hopeful are they?
```

**Why:** every excerpt carries its film title and scene heading and a number to cite. The rules allow careful
inference but no outside knowledge. The excerpt text is exactly what was stored at ingestion, which is exactly the
source file.

### Stage 6. The answer (streamed)

```text
(pending: real qwen3.5:4b answer)
```

**After the stream:** the page links each `[n]` to source `n` and warns about numbers that match no source
(`unmatchedCitations` in `src/rag/citations.ts`). The answer is stored for the next question with `[1]` replaced by
`(Frozen Canyon (synthetic sample) — EXT. FROZEN CANYON - TWILIGHT)` (`resolveCitations`), because the next question
numbers its excerpts afresh.

---

## Question 2 (follow-up): "What does the pilot say to it?"

Only what changes is shown.

### Stage 1. The HyDE prompt now includes the conversation

```text
[user]
Conversation so far:
User: Who is trying to fix the engine, and how hopeful are they?
Assistant: (answer 1, with citations resolved to labels)

Question: What does the pilot say to it?
```

The last four turns are included, so "it" can be anchored to the engine and the droid.

### Stage 3. The search text carries the previous question

```text
[text 1]
Represent this sentence for searching relevant passages: Who is trying to fix the engine, and how hopeful are they?
What does the pilot say to it?
```

**Why:** "What does the pilot say to it?" alone gives the search little to go on. With the previous question, a
similar follow-up in testing moved the right scene's score from 0.408 to 0.644
([ADR-0004](adr/0004-query-pipeline.md)).

### Stage 5. The answer prompt carries the full history

The system rules and the numbered excerpts are as before; between them sit the previous question and answer, so the
model can work out that "it" is the droid (or the engine).

### Stage 6. The answer

```text
(pending: real qwen3.5:4b answer)
```

---

## What this trace shows

- Two model calls per question: imagine, then answer. Everything between them is deterministic.
- Retrieval quality depends on the search texts more than on the model: the blended, follow-up-aware query is the main
  lever.
- The model only ever sees the excerpts you stored, labelled and numbered; citations are checked against them.
- History is plain text in the prompt. Nothing is remembered between requests except what the browser (or the `ask`
  session) sends back.
