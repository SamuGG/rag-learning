# Retrieval design

Why retrieval and answering work the way they do. Each section states the decision, the reason, and where the
evidence lives. Numbers come from tests on the synthetic samples; they are recorded in the ADRs and only summarised
here.

## The idea in one paragraph

A language model only knows what it was trained on and what you put in its prompt. Retrieval-augmented generation
(RAG) finds the passages of _your_ documents that are relevant to a question and puts them in the prompt, so the model
answers from them. The quality of the answer is capped by the quality of what is retrieved, so most of the design is
about finding the right scenes and keeping the model honest about them.

## Chunking: scenes, blocks, ~450 tokens, semantic overlap

- **Scenes first.** A scene is the natural unit of meaning in a screenplay, and a question usually targets one. Chunks
  never mix scenes, which also keeps the `Title — HEADING` label truthful.
- **Blocks are indivisible.** Splitting a dialogue block separates a line from its speaker; splitting mid-sentence
  hurts both the embedding and the answer.
- **~450 tokens, counted by the embedder's own tokenizer.** The embedding model reads at most 512 tokens; 450 leaves
  room for the title and heading prefix. Counting with the same tokenizer means 450 is what the model actually sees.
- **Semantic overlap.** Each chunk starts with up to 100 tokens of whole blocks from the previous one, so context at a
  boundary (usually the last exchange) is not lost.

Details: [chunking](chunking.md), [ADR-0002](adr/0002-chunking.md).

## Embeddings: small, local, prefixed

- `bge-small-en-v1.5` via Fastembed: 384 dimensions, runs on the CPU in milliseconds, no API key.
- Chunks are embedded as `title + heading + text`, so the film and place are part of what is matched.
- Pinecone compares vectors by **cosine similarity**: 1 means same direction (same meaning), around 0 unrelated.
  Scores between 0.4 and 0.7 are typical for short screenplay scenes; only their _ranking_ matters.

## HyDE: search with an imagined scene

Questions ("Who is trying to fix the engine?") look nothing like screenplay text. **HyDE** (hypothetical document
embeddings) asks the model to write a short scene that could contain the answer and searches with that, so the query
has the same shape as the stored chunks. It costs one extra model call, the first of the two per question.

## Blending the question back in

A 4B model's imagined scene drifts: tests produced invented garages and characters instead of the canyon and the droid.
The search vector is therefore the **average** of two embeddings:

- the question, with BGE's query instruction (`Represent this sentence for searching relevant passages: `);
- the imagined scene.

With the same drifted scene, the gap between the right and wrong scene went from 0.012 to 0.027
([ADR-0004](adr/0004-query-pipeline.md)).

## Follow-up questions

"Does their plan work?" means nothing on its own. The search text includes **the previous question**, which moved the
right scene's score from 0.408 to 0.644 against 0.453 for the wrong one. The answer prompt also tells the model to work
out who "they" or "it" are from the conversation.

## Grounding, inference and "not found"

The answer prompt's rules:

- base every statement on the excerpts; **reasonable inferences are allowed if worded as such** ("the alarm suggests
  the plan fails"); never outside knowledge or invented details;
- say the answer is not in the screenplays **only** when there is no direct or inferable evidence;
- summarise rather than copy; be concise.

The inference rule came from testing: without it, the model refused to read "An alarm blares." as a sign the
smugglers' plan failed.

## Citations by number

Excerpts are numbered `[1] Title — HEADING` and the model cites `[1]`. A 4B model shortened or invented long
`[Title — HEADING]` labels but copies short numbers reliably. The page links each number to its source and flags any
number that matches no excerpt.

## The conversation

The full history is sent with each question so follow-ups make sense. It is trimmed, oldest first, only when it would
overflow the context window; the token estimate starts at 3 characters per token and is recalibrated from Ollama's
reported prompt size. Stored answers replace `[n]` with the scene label because the next question renumbers its
excerpts.

## What would improve it next

- **An evaluation set** ([#26](https://github.com/SamuGG/rag-learning/issues/26)): ~20 questions with the scenes that
  answer them, measuring hit@K (is the right scene in the top K?) and MRR (how high?). It would turn the comparisons
  above into a repeatable benchmark on real screenplays.
- **Reranking** ([#27](https://github.com/SamuGG/rag-learning/issues/27)): retrieve ~20 candidates, re-score each
  (question, chunk) pair with a cross-encoder, keep the best 5. Worth adding only if the evaluation set shows a gain.
