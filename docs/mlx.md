# MLX for beginners

[MLX](https://github.com/ml-explore/mlx) is Apple's machine-learning framework for Apple Silicon. The `mlx-lm` Python
package runs language models with it and can serve them through an OpenAI-compatible HTTP API. Models come from the
Hugging Face [MLX community](https://huggingface.co/mlx-community); public models need no account.

> **This app does not use MLX directly.** Ollama already runs models on the MLX backend, so it is the only chat
> runner ([ADR-0005](adr/0005-single-llm-runner.md)). This page is a reference for experimenting with MLX on its own.
> Stop Ollama's model (`ollama stop <model>`) before loading another with `mlx_lm` on a 16 GB Mac.

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
