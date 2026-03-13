# Providers

Providers are LLM backends that pest sends prompts to. Each provider wraps a specific API and normalizes the response format.

## Supported providers

| Type | Service | Tool calls | Streaming |
|------|---------|------------|-----------|
| `openai` | OpenAI API (GPT-4o, GPT-4, etc.) | Yes | Planned |
| `anthropic` | Anthropic API (Claude Sonnet, Opus, Haiku) | Yes | Planned |
| `gemini` | Google Gemini API (Gemini 2.5, 3, etc.) | Yes | Planned |
| `xai` | xAI Grok API (Grok 4, etc.) | Yes | Planned |
| `ollama` | Ollama (local models) | Yes (model-dependent) | Planned |

## Provider interface

All providers implement the same interface:

```typescript
interface Provider {
  name: string;
  type: 'openai' | 'anthropic' | 'ollama';
  type: 'openai' | 'anthropic' | 'gemini' | 'xai' | 'ollama';
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

interface CompletionRequest {
  systemPrompt: string;
  userMessage: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

interface CompletionResponse {
  text: string;
  toolCalls: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  raw: unknown;
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  id?: string;
}
```

## Configuration

### OpenAI

Works with the OpenAI API and any OpenAI-compatible endpoint (Azure, Together, etc.).

```typescript
{
  name: 'gpt-4o',
  type: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
  baseUrl: 'https://api.openai.com',   // Optional
  temperature: 0,
  maxTokens: 4096,
}
```

For Azure OpenAI:

```typescript
{
  name: 'azure-gpt4',
  type: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseUrl: 'https://myinstance.openai.azure.com',
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
  maxTokens: 4096,
}
```

### Ollama

Connects to a local Ollama instance. No API key required.

```typescript
{
  name: 'llama-local',
  type: 'ollama',
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434',  // Default
}
```

Tool call support depends on the model. `llama3.2` and `mistral` support tool calling. Smaller models may not.

### Google Gemini

Uses the `@google/genai` SDK. Supports function calling via `functionDeclaration` with JSON schema parameters.

```typescript
{
  name: 'gemini-2',
  type: 'gemini',
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_AI_API_KEY,
}
```

Available models: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3-pro`, etc.

For Vertex AI:

```typescript
{
  name: 'gemini-vertex',
  type: 'gemini',
  model: 'gemini-2.5-pro',
  apiKey: process.env.GOOGLE_AI_API_KEY,
  vertexProject: 'my-project',
  vertexLocation: 'us-central1',
}
```

### xAI Grok

xAI provides an OpenAI-compatible API. pest wraps it with a dedicated `xai` type for convenience (sets the correct base URL and handles any xAI-specific behavior).

```typescript
{
  name: 'grok-4',
  type: 'xai',
  model: 'grok-4',
  apiKey: process.env.XAI_API_KEY,
}
```

Available models: `grok-4`, `grok-3`, `grok-4-fast`, etc.

You can also use `type: 'openai'` with a custom base URL if you prefer:

```typescript
{
  name: 'grok-via-openai',
  type: 'openai',
  model: 'grok-4',
  apiKey: process.env.XAI_API_KEY,
  baseUrl: 'https://api.x.ai/v1',
}
```

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
});
```

## Provider selection in tests

Target specific providers per suite:

```typescript
describe('My Suite', {
  systemPrompt: PROMPT,
  providers: ['gpt-4o', 'claude-sonnet'],  // Only these two
}, () => {
  // Tests run against gpt-4o and claude-sonnet only
});
```

If `providers` is omitted, all configured providers are used.

## Custom providers

Register custom providers programmatically:

```typescript
import { defineProvider } from 'pest';

const myProvider = defineProvider({
  name: 'my-custom-llm',
  async complete(request) {
    const response = await fetch('https://my-api.com/v1/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userMessage },
        ],
        tools: request.tools,
      }),
    });
    // Parse and return CompletionResponse
  },
});
```

## Rate limiting

```typescript
export default defineConfig({
  limits: {
    concurrency: 3,           // Max parallel requests
    requestsPerMinute: 30,    // Global rate limit
  },
});
```

Requests are queued and throttled automatically. Rate-limited responses are retried with exponential backoff.
