# Backlog

This file is the **authoritative backlog**. GitHub Issues and Milestones mirror it; update this file first when scope
changes.

## M0 Foundations (done, [#28](https://github.com/SamuGG/rag-learning/pull/28))

- [#1](https://github.com/SamuGG/rag-learning/issues/1) Scaffold project tooling
- [#2](https://github.com/SamuGG/rag-learning/issues/2) Typed environment and lazy config
- [#3](https://github.com/SamuGG/rag-learning/issues/3) Docs skeleton, ADR-0001 and sample-data policy
- [#4](https://github.com/SamuGG/rag-learning/issues/4) Beginner guides for Ollama and MLX
- [#6](https://github.com/SamuGG/rag-learning/issues/6) Spike: SolidStart v2 and Tailwind on Bun with server functions
- [#7](https://github.com/SamuGG/rag-learning/issues/7) Spike: Fastembed on Bun
- [#8](https://github.com/SamuGG/rag-learning/issues/8) Spike: Pinecone Starter plan
- [#9](https://github.com/SamuGG/rag-learning/issues/9) Spike: Ollama `qwen3.5:4b` and doctor script (Mac)

## M1 Chunker (done, [#28](https://github.com/SamuGG/rag-learning/pull/28))

- [#10](https://github.com/SamuGG/rag-learning/issues/10) Heading rules and scene segmentation
- [#11](https://github.com/SamuGG/rag-learning/issues/11) Block segmentation and dialogue gluing
- [#12](https://github.com/SamuGG/rag-learning/issues/12) Token counter aligned with the embedder
- [#13](https://github.com/SamuGG/rag-learning/issues/13) Packing with semantic overlap
- [#14](https://github.com/SamuGG/rag-learning/issues/14) Chunk preview CLI and chunking docs

## M2 Ingestion (done, [#29](https://github.com/SamuGG/rag-learning/pull/29))

- [#15](https://github.com/SamuGG/rag-learning/issues/15) Manifest validation
- [#16](https://github.com/SamuGG/rag-learning/issues/16) Embedder wrapper
- [#17](https://github.com/SamuGG/rag-learning/issues/17) Pinecone store, one-shot guard and ingest CLI

## M3 Query (done, [#30](https://github.com/SamuGG/rag-learning/pull/30))

- [#18](https://github.com/SamuGG/rag-learning/issues/18) `ChatModel` interface and Ollama client
- [#19](https://github.com/SamuGG/rag-learning/issues/19) HyDE retrieval and answer prompt
- [#20](https://github.com/SamuGG/rag-learning/issues/20) `ask` CLI

## M4 UI (done, [#31](https://github.com/SamuGG/rag-learning/pull/31))

- [#21](https://github.com/SamuGG/rag-learning/issues/21) Chat page
- [#22](https://github.com/SamuGG/rag-learning/issues/22) End-to-end tests with fake services

## M5 Docs & polish

- [#23](https://github.com/SamuGG/rag-learning/issues/23) Project documentation set

## M6 Optional MLX provider (dropped)

- [#24](https://github.com/SamuGG/rag-learning/issues/24) Not planned: Ollama already runs models on MLX, so a second runner adds nothing
  ([ADR-0005](adr/0005-single-llm-runner.md)).

## Later

- [#25](https://github.com/SamuGG/rag-learning/issues/25) Document upload page
- [#26](https://github.com/SamuGG/rag-learning/issues/26) Retrieval evaluation set: about 20 questions with expected scenes; hit@K and MRR;
  HyDE versus direct query embedding
- [#27](https://github.com/SamuGG/rag-learning/issues/27) Optional reranking, only if the evaluation set shows a gain
