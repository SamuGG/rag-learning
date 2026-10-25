# RAG applied to this project

> Skeleton; completed in milestone M5.

- **Why scenes:** a scene is the natural unit of meaning in a screenplay. Chunks never mix scenes, and dialogue blocks
  are never split.
- **Why ~450 tokens:** the embedding model reads at most 512 tokens; 450 leaves room for the title and heading prefix.
- **Why semantic overlap:** whole screenplay units from the end of a chunk are repeated at the start of the next one,
  so retrieval keeps context across chunk boundaries.
- **Why HyDE:** questions ("why does the pilot distrust the droid?") look nothing like screenplay text. Embedding a
  hypothetical scene puts the query in the same "shape" as the stored chunks.
- **Why the same tokenizer:** chunk sizes are measured with the embedding model's own tokenizer, so the 450-token target
  matches what the model actually sees.
