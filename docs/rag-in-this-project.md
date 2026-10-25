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
- **Why blend the question in:** a 4B model's hypothetical scene can drift (a different place, invented characters).
  Averaging its embedding with the question's, embedded with BGE's query instruction, keeps the search anchored to
  what was asked while still benefiting from the scene-shaped text.
- **Why numbered citations:** a 4B model shortened or invented long `[Title — HEADING]` labels but copies short
  numbers reliably. Excerpts are numbered `[1] Title — HEADING`, answers cite `[1]`, and the sources list below the
  answer maps numbers to scenes. Numbers that match no excerpt are flagged instead of silently trusted.
