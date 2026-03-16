# Local LLMs

pest supports local LLM servers via the `ollama` provider type, which uses the OpenAI-compatible API. This works with Ollama, llama.cpp, LocalAI, vLLM, and any server that exposes an OpenAI-compatible `/v1/chat/completions` endpoint.

## Why use local LLMs?

- **Free** — no API costs, run as many tests as you want
- **Private** — prompts never leave your machine
- **Fast iteration** — no rate limits, no network latency
- **Offline** — works without internet
- **CI/CD** — self-hosted runners with GPU can run prompt tests without API keys

## Ollama

[Ollama](https://ollama.ai) is the simplest way to run models locally.

### Setup

1. Install Ollama:
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

2. Pull a model:
```bash
ollama pull llama3.2
ollama pull qwen2.5
ollama pull gemma2
```

3. Ollama starts automatically and serves on `http://localhost:11434`.

### Configuration

```ts
// pest.config.ts
import { defineConfig } from "@heilgar/pest-core";

export default defineConfig({
  providers: [
    {
      name: "llama",
      type: "ollama",
      model: "llama3.2",
      // baseUrl defaults to http://localhost:11434/v1
    },
  ],
});
```

Or create a provider directly:

```ts
import { createProvider } from "@heilgar/pest-core";

const provider = createProvider({
  name: "llama",
  type: "ollama",
  model: "llama3.2",
});
```

### Using as judge

Local models can serve as the judge for LLM-judged matchers. Larger models (70B+) give better evaluation quality:

```ts
export default defineConfig({
  providers: [
    { name: "llama-small", type: "ollama", model: "llama3.2" },
    { name: "llama-judge", type: "ollama", model: "llama3.1:70b" },
  ],
  judge: {
    provider: "llama-judge",
  },
});
```

::: warning
Smaller models (< 13B parameters) may produce unreliable judge evaluations. For critical safety tests, use a capable cloud model as judge even if you test against a local model.
:::

## llama.cpp

[llama.cpp](https://github.com/ggerganov/llama.cpp) provides a lightweight server with an OpenAI-compatible API.

### Setup

```bash
# Start the server
./llama-server -m models/llama-3.2-3b.gguf --port 8080
```

### Configuration

Use the `ollama` provider type with a custom `baseUrl`:

```ts
import { defineConfig } from "@heilgar/pest-core";

export default defineConfig({
  providers: [
    {
      name: "llama-cpp",
      type: "ollama",
      model: "local",
      baseUrl: "http://localhost:8080/v1",
    },
  ],
});
```

## LocalAI

[LocalAI](https://localai.io) is a drop-in OpenAI API replacement.

```ts
{
  name: "localai",
  type: "ollama",
  model: "lunademo",
  baseUrl: "http://localhost:8080/v1",
}
```

## vLLM

[vLLM](https://docs.vllm.ai) is a high-throughput inference server, ideal for running many test cases in parallel.

```bash
python -m vllm.entrypoints.openai.api_server --model meta-llama/Llama-3-8B-Instruct --port 8000
```

```ts
{
  name: "vllm",
  type: "ollama",
  model: "meta-llama/Llama-3-8B-Instruct",
  baseUrl: "http://localhost:8000/v1",
  apiKey: "dummy", // vLLM requires a key but doesn't validate it
}
```

## Any OpenAI-compatible server

The `ollama` provider type works with any server that implements the OpenAI chat completions API. Just set the `baseUrl`:

```ts
{
  name: "my-server",
  type: "ollama",
  model: "my-model",
  baseUrl: "http://my-server:8080/v1",
  apiKey: "optional-key",
}
```

## Mixing local and cloud

A common pattern: test against a local model for fast iteration, then validate with a cloud model before merging. Use the CLI to compare:

```bash
pest compare --test tests/ --providers llama,gpt4o
```

Or in your config, define both:

```ts
export default defineConfig({
  providers: [
    { name: "llama", type: "ollama", model: "llama3.2" },
    { name: "gpt4o", type: "openai", model: "gpt-4o" },
  ],
  judge: {
    provider: "gpt4o", // cloud model as judge for reliability
  },
});
```

Test files using `useProvider()` work with both — the CLI switches between them:

```ts
const provider = await useProvider(); // llama locally, gpt4o in CI
```

## Tool calling with local models

Not all local models support tool/function calling. Models that do:

| Model | Tool calling | Notes |
|---|---|---|
| Llama 3.2 | Yes | Good tool calling support |
| Qwen 2.5 | Yes | Strong tool calling |
| Mistral | Yes | Via Ollama |
| Gemma 2 | Limited | Basic support |
| Phi-3 | No | Text-only |

If your model doesn't support tools, deterministic tool matchers (`toContainToolCall`, `toCallToolsInOrder`) will fail. LLM-judged matchers (`toSatisfyCriteria`, `toNotDisclose`) still work since they only need text generation.

## Performance tips

- **GPU acceleration** — Ollama and llama.cpp use GPU by default on supported hardware
- **Quantization** — Use quantized models (Q4_K_M, Q5_K_M) for faster inference with minimal quality loss
- **Batch tests** — vLLM handles concurrent requests well; increase vitest `pool.threads` for parallelism
- **Model size** — 7-8B models are a good balance of speed and quality for testing. Use 70B+ for judge evaluations
