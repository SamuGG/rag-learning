# Tidy-up resources

Remove everything this project created when you are done.

| Resource         | How to remove                                                                     |
| ---------------- | --------------------------------------------------------------------------------- |
| Pinecone data    | `bun run reset-store --yes` (milestone M2) or delete the namespace in the console |
| Pinecone index   | Delete `rag-screenplays` in the [Pinecone console](https://app.pinecone.io/)      |
| Embedding model  | `rm -rf .cache/fastembed`                                                         |
| Ollama model     | `ollama rm qwen3.5:4b` ([Ollama guide](ollama.md))                                |
| MLX model        | See [MLX guide](mlx.md#models)                                                    |
| Build output     | `rm -rf .output .nitro node_modules`                                              |
| Your screenplays | `rm -rf data/screenplays`                                                         |
| Secrets          | Delete `.env`; revoke the Pinecone API key in the console                         |
