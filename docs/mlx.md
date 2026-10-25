# MLX for beginners

[MLX](https://github.com/ml-explore/mlx) is Apple's machine-learning framework for Apple Silicon. The `mlx-lm` Python
package runs language models with it and can serve them through an OpenAI-compatible HTTP API. Models come from the
Hugging Face [MLX community](https://huggingface.co/mlx-community); public models need no account.

> MLX and [Ollama](ollama.md) are **alternatives**. Run one or the other, never both. This app will use MLX when
> `LLM_PROVIDER=mlx` is set, which arrives in milestone M6. The model is the same Qwen3.5 4B, named
> `mlx-community/Qwen3.5-4B-8bit` on MLX instead of `qwen3.5:4b` on Ollama.

## One-time setup

```sh
brew install python
mkdir -p ~/workspaces/mlx && cd ~/workspaces/mlx   # any folder works
python3 -m venv myenv                              # create an isolated Python environment
source myenv/bin/activate                          # enter it (your prompt shows "(myenv)")
pip install mlx-lm
deactivate                                         # leave it
```

## Getting started

Open a terminal in the workspace: `cd ~/workspaces/mlx`

Enter the Python environment: `source myenv/bin/activate`

Run `mlx_lm` commands:

- General help: `mlx_lm -h`
- Command help: `mlx_lm.generate -h`
- Send a prompt to the default model: `mlx_lm.generate --prompt "Hello"`
- Start a chat loop with a model: `mlx_lm.chat --model mlx-community/Qwen3.5-4B-8bit`
- Start an HTTP server with a model: `mlx_lm.server --model mlx-community/Qwen3.5-4B-8bit`
  - Send a request:

    ```sh
    curl -X POST http://127.0.0.1:8080/v1/chat/completions \
      -H "Content-Type: application/json" \
      -d '{ "model": "default_model", "messages": [{ "role": "user", "content": "Hello" }] }'
    ```

Leave the Python environment: `deactivate`

## Models

Browse models at the Hugging Face [MLX community](https://huggingface.co/mlx-community). Downloaded models are cached
under `~/.cache/huggingface/hub/`.

Clear a downloaded model:

```sh
rm -rf ~/.cache/huggingface/hub/models--mlx-community--Qwen3.5-4B-8bit
```

## Using MLX with this app (milestone M6)

1. Stop Ollama (`brew services stop ollama`).
2. Start `mlx_lm.server --model mlx-community/Qwen3.5-4B-8bit`.
3. In `.env`: `LLM_PROVIDER=mlx`, `MLX_HOST=http://127.0.0.1:8080`, `CHAT_MODEL=mlx-community/Qwen3.5-4B-8bit`.
