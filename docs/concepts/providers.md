::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# Providers

Providers are LLM backends that pest sends prompts to. Each provider wraps a specific API and normalizes the response format.

## Supported providers

| Type | Service | SDK |
|------|---------|-----|
| `openai` | OpenAI API (GPT-4o, o1, etc.) | `openai` |
| `anthropic` | Anthropic API (Claude Sonnet, Opus, Haiku) | `@anthropic-ai/sdk` |
| `gemini` | Google Gemini API (Gemini 2.5, etc.) | `@google/genai` |
| `xai` | xAI Grok API (Grok 4, etc.) | OpenAI-compatible |
| `ollama` | Ollama (local models) | OpenAI-compatible |

## Provider interface

All providers implement the same interface:

```typescript
interface Provider {
  name: string;
  chat(options: ProviderRequestOptions): Promise<ProviderResponse>;
}

interface ProviderRequestOptions {
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  tools?: ToolDefinition[];
  temperature?: number;
}

interface ProviderResponse {
  text: string;
  toolCalls: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}
```

## Configuration

### OpenAI

Works with the OpenAI API and any OpenAI-compatible endpoint.

```typescript
{
  name: 'gpt-4o',
  type: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
  baseUrl: 'https://api.openai.com',   // Optional: custom endpoint
  temperature: 0,
}
```

### Anthropic

```typescript
{
  name: 'claude-sonnet',
  type: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  apiKey: process.env.ANTHROPIC_API_KEY,
  temperature: 0,
}
```

### Google Gemini

Uses the `@google/genai` SDK.

```typescript
{
  name: 'gemini-2',
  type: 'gemini',
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_AI_API_KEY,
}
```

### xAI Grok

xAI provides an OpenAI-compatible API. The `xai` type sets the correct base URL (`https://api.x.ai/v1`) automatically.

```typescript
{
  name: 'grok-4',
  type: 'xai',
  model: 'grok-4',
  apiKey: process.env.XAI_API_KEY,
}
```

You can also use `type: 'openai'` with a custom base URL:

```typescript
{
  name: 'grok-via-openai',
  type: 'openai',
  model: 'grok-4',
  apiKey: process.env.XAI_API_KEY,
  baseUrl: 'https://api.x.ai/v1',
}
```

### Ollama

Connects to a local Ollama instance. No API key required. Uses the OpenAI-compatible API at `http://localhost:11434/v1`.

```typescript
{
  name: 'llama-local',
  type: 'ollama',
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434',  // Optional: default value
}
```

Tool call support depends on the model.

## Multiple providers

Configure multiple providers to compare models:

```typescript
export default defineConfig({
  providers: [
    { name: 'gpt-4o', type: 'openai', model: 'gpt-4o', apiKey: process.env.OPENAI_API_KEY },
    { name: 'claude-sonnet', type: 'anthropic', model: 'claude-sonnet-4-20250514', apiKey: process.env.ANTHROPIC_API_KEY },
    { name: 'gemini-2', type: 'gemini', model: 'gemini-2.5-flash', apiKey: process.env.GOOGLE_AI_API_KEY },
    { name: 'grok-4', type: 'xai', model: 'grok-4', apiKey: process.env.XAI_API_KEY },
    { name: 'llama-local', type: 'ollama', model: 'llama3.2' },
  ],
})
```

## Provider selection in tests

Target specific providers per suite:

```typescript
describe('My Suite', {
  systemPrompt: PROMPT,
  providers: ['gpt-4o', 'claude-sonnet'],  // Only these two
}, () => {
  // Tests run against gpt-4o and claude-sonnet only
})
```

If `providers` is omitted, all configured providers are used.

## Limits

```typescript
export default defineConfig({
  limits: {
    concurrency: 3,           // Max parallel requests
    requestsPerMinute: 30,    // Rate limit
    timeout: 30_000,          // Per-request timeout (ms)
  },
})
```
