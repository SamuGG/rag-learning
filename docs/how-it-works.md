# How it works

> Skeleton; completed in milestone M5.

1. **Ingestion (one-shot).** Each screenplay listed in the manifest is split into scenes, then into chunks of about 450
   tokens with semantic overlap ([chunking](chunking.md)). Every chunk is embedded locally with Fastembed and stored in
   Pinecone with its film title and scene heading. Ingestion refuses to run if the store already holds data; reset it
   to re-ingest.
2. **Question.** Each chat request makes exactly two LLM calls:
   1. **Hypothesise:** the LLM writes a short passage that a relevant scene might contain (HyDE).
   2. **Search:** that passage is embedded and used for a top-K similarity search in Pinecone.
   3. **Answer:** the retrieved chunks, each prefixed with `[Title — SCENE HEADING]`, the question and the conversation
      history go to the LLM, which answers with citations.
3. **History** lives in the browser for the current session only.
