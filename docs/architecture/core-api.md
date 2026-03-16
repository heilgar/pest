# Core API

`@heilgar/pest-core` exports the shared foundation. Everything here is framework-agnostic.

## `send(provider, message, options?)`

The public API for calling an LLM provider. This is a top-level function — not a method on the provider.

```ts
import { send, createProvider } from "@heilgar/pest-core";

const provider = createProvider({
  name: "gpt4o",
  type: "openai",
  model: "gpt-4o",
});

const res = await send(provider, "What is the capital of France?");
```

`send()` is the only way users call providers. The `Provider` interface's internal `.call()` method is not exposed — `send()` wraps it to normalize responses, track usage, and handle errors consistently.

### Parameters

| Param | Type | Description |
|---|---|---|
| `provider` | `Provider` | Provider instance created via `createProvider()` |
| `message` | `string` | User message |
| `options` | `SendOptions` | Optional: system prompt, tools, temperature, etc. |

### SendOptions

```ts
interface SendOptions {
  systemPrompt?: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}
```

### Response shape

```ts
interface PestResponse {
  text: string;
  toolCalls: ToolCall[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  raw: unknown;
  latencyMs: number;
  provider: string;
  model: string;
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}
```

## `createProvider(config)`

Factory function that creates a provider instance. Picks the right SDK based on `type`.

```ts
import { createProvider } from "@heilgar/pest-core";

const gpt4o = createProvider({ name: "gpt4o", type: "openai", model: "gpt-4o" });
const claude = createProvider({ name: "claude", type: "anthropic", model: "claude-sonnet-4-20250514" });
const gemini = createProvider({ name: "gemini", type: "gemini", model: "gemini-2.0-flash" });
const grok = createProvider({ name: "grok", type: "xai", model: "grok-3" });
const local = createProvider({ name: "local", type: "ollama", model: "llama3" });
```

### Provider config

```ts
interface ProviderConfig {
  name: string;
  type: "openai" | "anthropic" | "gemini" | "xai" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
}
```

### `createProviders(configs)`

Create multiple providers at once. Returns `Map<string, Provider>`.

```ts
const providers = createProviders([
  { name: "gpt4o", type: "openai", model: "gpt-4o" },
  { name: "claude", type: "anthropic", model: "claude-sonnet-4-20250514" },
]);

const gpt = providers.get("gpt4o");
```

### Provider interface (internal)

Providers implement this interface internally. Users don't call `.call()` directly — they use the top-level `send()` function.

```ts
interface Provider {
  name: string;
  model: string;
  call(options: ProviderRequestOptions): Promise<ProviderResponse>;
}
```

### API key resolution

Keys are resolved in order:
1. Explicit `apiKey` option in provider config
2. Environment variable (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.)
3. `.env` file in project root

## Matcher Logic (internal)

Core exports pure matcher functions used by extensions. These are not meant to be called directly by users — they're consumed by `@heilgar/pest-vitest` and `@heilgar/pest-jest`.

```ts
// Deterministic matchers
export function containsToolCall(response: PestResponse, name: string, args?: Record<string, unknown>): MatcherResult;
export function callsToolsInOrder(response: PestResponse, names: string[]): MatcherResult;
export function matchesResponseSchema(response: PestResponse, schema: BaseSchema): MatcherResult;
export function respondsWithinTokens(response: PestResponse, maxTokens: number): MatcherResult;
export function containsText(response: PestResponse, text: string): MatcherResult;
export function hasToolCallCount(response: PestResponse, count: number): MatcherResult;

// LLM-judged matchers — judge is passed by the extension layer after resolving from config
export function matchesSemanticMeaning(response: PestResponse, expected: string, judge: Provider, options?: SemanticOptions): Promise<MatcherResult>;
export function satisfiesCriteria(response: PestResponse, rubric: string | RubricConfig, judge: Provider): Promise<MatcherResult>;
export function classifiedAs(response: PestResponse, label: string, judge: Provider, options?: ClassificationOptions): Promise<MatcherResult>;
export function doesNotDisclose(response: PestResponse, topic: string, judge: Provider): Promise<MatcherResult>;
```

Note: LLM-judged functions require a `judge: Provider` parameter. Users don't pass this — the extension layer resolves it from config or per-assertion override and injects it. See [Matchers > Judge resolution](/architecture/matchers#judge-resolution).

### MatcherResult

```ts
interface MatcherResult {
  pass: boolean;
  message: string;
  score?: number;
  reasoning?: string;
  metadata?: Record<string, unknown>;
}
```

## Standalone Functions

Exported directly from core for use in test files:

```ts
export async function assertConsistent(
  provider: Provider,
  message: string,
  runs: number,
  options?: { threshold?: number; judge?: Provider }
): Promise<{ pass: boolean; scores: number[]; reasoning: string[] }>;
```

See [Matchers > assertConsistent](/architecture/matchers#assertconsistent-provider-message-n-options).

## Config

### `defineConfig(config)`

Type-safe config definition for `pest.config.ts`. See [Configuration](/guide/configuration) for full reference.

```ts
import { defineConfig } from "@heilgar/pest-core";

export default defineConfig({
  providers: [
    { name: "gpt4o", type: "openai", model: "gpt-4o" },
    { name: "claude", type: "anthropic", model: "claude-sonnet-4-20250514" },
  ],
  judge: {
    provider: "claude",
  },
});
```

### `loadConfig(path?)`

Loads and validates config from `pest.config.ts`. Also calls `loadEnv()` automatically.

```ts
import { loadConfig } from "@heilgar/pest-core";

const config = await loadConfig(); // searches up from cwd
const config = await loadConfig("./custom.config.ts");
```

### `loadEnv(cwd?)`

Load `.env` and `.env.local` files from the project root into `process.env`.

```ts
import { loadEnv } from "@heilgar/pest-core";

loadEnv(); // loads from cwd, idempotent
```

Called automatically by `createProvider()` and `loadConfig()`. Call it explicitly in your setup file if you need env vars loaded before provider creation (e.g. for conditional `process.env` checks at import time).

Files loaded in priority order (highest wins):
1. Shell / CI environment variables (never overwritten)
2. `.env.local` — local overrides, gitignored
3. `.env` — shared defaults

Project root is detected by looking for `pest.config.ts` or `package.json` up from `cwd`.

## Helpers

Bridge functions between CLI and test files.

### `useProvider(fallbackName?)`

Resolve the active provider from `PEST_PROVIDER` env + `pest.config.ts`.

```ts
import { useProvider } from "@heilgar/pest-core";

const provider = await useProvider(); // PEST_PROVIDER or first provider in config
const provider = await useProvider("gpt4o"); // PEST_PROVIDER or "gpt4o" from config
```

When running vitest directly, returns the fallback (or first provider in config). When the CLI runs tests, it sets `PEST_PROVIDER` to control which provider is used.

### `useSystemPrompt(default)`

Resolve system prompt with `PEST_SYSTEM_PROMPT` env override.

```ts
import { useSystemPrompt } from "@heilgar/pest-core";

const prompt = useSystemPrompt("You are a helpful assistant.");
// returns PEST_SYSTEM_PROMPT if set, otherwise the default string
```

Used by `pest optimize` and `pest compress` to swap prompts between iterations without modifying test files.

## Tool Definitions

For testing tool-calling models:

```ts
import { send, createProvider } from "@heilgar/pest-core";

const provider = createProvider({
  name: "gpt4o",
  type: "openai",
  model: "gpt-4o",
});

const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_flights",
      description: "Search for flights",
      parameters: {
        type: "object",
        properties: {
          destination: { type: "string" },
          date: { type: "string" },
        },
        required: ["destination"],
      },
    },
  },
];

const res = await send(provider, "Find flights to Paris", { tools });
```
