# Tidy-up resources

Remove what this project created when you are done.

| Resource             | How to remove                                                                           |
| -------------------- | --------------------------------------------------------------------------------------- |
| Pinecone data        | `bun run reset-store --yes`, and `PINECONE_NAMESPACE=samples bun run reset-store --yes` |
| Pinecone index       | Delete `rag-screenplays` in the [Pinecone console](https://app.pinecone.io/)            |
| Ollama model         | `ollama stop qwen3.5:4b` (unload), then `ollama rm qwen3.5:4b` ([guide](ollama.md))     |
| Ollama service       | `brew services stop ollama`                                                             |
| Embedding model      | `rm -rf .cache/fastembed`                                                               |
| Build and test files | `rm -rf .output .nitro node_modules`                                                    |
| Your screenplays     | `rm -rf data/screenplays`                                                               |
| Secrets              | Delete `.env`; revoke the Pinecone API key in the console                               |

The Pinecone index and the `samples` namespace are shared by every run; reset only the namespace you want to re-ingest.
