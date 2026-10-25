# Ollama for beginners

[Ollama](https://ollama.com/) downloads open-weight language models and serves them through a local HTTP API. This app
sends its chat requests to that API. You do not need an account to pull models.

> On Apple Silicon, Ollama runs models with Apple's MLX backend (`ollama ps` shows `RUNNER mlx`), so it is the
> app's only chat runner ([ADR-0005](adr/0005-single-llm-runner.md)). Don't run another model server at the same time:
> on a 16 GB Mac two loaded models compete for memory.

## Install and start

```sh
brew install ollama
brew services start ollama   # runs in the background and starts at login
# or, for a one-off session in a terminal:
ollama serve
```

Check that the API answers:

```sh
curl http://127.0.0.1:11434/api/tags
```

## Models

```sh
ollama pull qwen3.5:4b   # download the default chat model used by this app
ollama list              # downloaded models and their sizes
ollama run qwen3.5:4b    # chat in the terminal (type /bye to leave)
ollama ps                # models currently loaded in memory
ollama stop qwen3.5:4b   # unload a model from memory
ollama rm qwen3.5:4b     # delete a downloaded model
```

Models are stored in `~/.ollama/models`. Use `ollama rm` rather than deleting files by hand.

## Talking to the API

The app uses `POST /api/chat`. You can try it directly:

```sh
curl http://127.0.0.1:11434/api/chat -d '{
  "model": "qwen3.5:4b",
  "messages": [{ "role": "user", "content": "Hello" }],
  "think": false,
  "stream": false
}'
```

Always send `"think": false`: Qwen 3.5 thinks by default when `think` is omitted, which is slower and can spend the
whole answer budget on hidden reasoning.

With `"stream": true` the reply arrives as one JSON object per line (NDJSON).

## Memory tips for 16 GB

- Keep a single model loaded (`ollama ps`); stop others with `ollama stop`.
- The app sends the same `num_ctx` (context window, `OLLAMA_NUM_CTX`) on every request. Changing it between requests
  makes Ollama reload the model.
- Larger `num_ctx` values use more memory. 8192 suits a 4B model on 16 GB.
- Close memory-hungry apps if answers become very slow.

## Troubleshooting

| Symptom                            | Fix                                                                  |
| ---------------------------------- | -------------------------------------------------------------------- |
| `connection refused` on port 11434 | Start Ollama: `brew services start ollama` or `ollama serve`         |
| `model not found`                  | `ollama pull qwen3.5:4b`, then check `CHAT_MODEL` in `.env`          |
| First answer is slow               | The model is loading into memory; later answers are faster           |
| Answers slow down over time        | Check `ollama ps` for extra loaded models; stop MLX if it is running |
| Disk full                          | `ollama list` then `ollama rm <model>`                               |
