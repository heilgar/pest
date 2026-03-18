# API Reference

## Package overview

| Package | Purpose |
|---------|---------|
| `@heilgar/pest-core` | Providers, config, `send()`, matchers logic, evaluators, helpers |
| `@heilgar/pest-vitest` | vitest plugin + `expect.extend()` matchers + reporter |
| `@heilgar/pest-jest` | jest `expect.extend()` matchers + setup |
| `@heilgar/pest-playwright` | Playwright `expect.extend()` matchers (LLM-judged only) |
| `@heilgar/pest-mcp` | MCP server testing: discovery matchers, `sendWithMcp()`, CLI QA |
| `@heilgar/pest-cli` | CLI: `install` (agents & skills), `qa` (MCP smoke test) |

---

## @heilgar/pest-vitest

Primary import for vitest-based test files.

### `send(provider, message, options?)`

Send a message to an LLM provider and get a `PestResponse`.

```typescript
import { send } from '@heilgar/pest-vitest';

const res = await send(provider, 'user message', {
  systemPrompt?: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
});
```

### `createProvider(config)`

Create a provider instance.

```typescript
import { createProvider } from '@heilgar/pest-vitest';

const provider = createProvider({
  name: string;
  type: 'openai' | 'anthropic' | 'gemini' | 'xai' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
});
```

### `sendAgentic(provider, message, options?)`

Multi-turn agentic loop. Automatically executes tool calls via a `ToolExecutor` and continues the conversation until the model responds with text (no more tool calls) or `maxSteps` is reached.

```typescript
import { sendAgentic } from '@heilgar/pest-vitest';

const res = await sendAgentic(provider, 'Book a flight to Paris', {
  systemPrompt: 'You are a travel agent.',
  tools: [...],
  executor: async (name, args) => {
    // handle tool calls, return result
    return { status: 'booked', confirmation: 'ABC123' };
  },
  maxSteps: 10, // default: 10
});
```

### `zodTool(name, description, schema)`

Create a `ToolDefinition` from a Zod schema.

```typescript
import { zodTool } from '@heilgar/pest-vitest';
import { z } from 'zod';

const tool = zodTool('search_flights', 'Search for flights', z.object({
  destination: z.string(),
  date: z.string().optional(),
}));
```

### `setJudge(provider)`

Set the global judge provider for LLM-judged matchers.

```typescript
import { setJudge, createProvider } from '@heilgar/pest-vitest';

const judge = createProvider({ name: 'claude', type: 'anthropic', model: 'claude-sonnet-4-20250514' });
setJudge(judge);
```

### `pestPlugin()`

vitest plugin. Auto-wires the setup file that registers matchers.

```typescript
// vitest.config.ts
import { pestPlugin } from '@heilgar/pest-vitest/plugin';

export default defineConfig({
  plugins: [pestPlugin()],
});
```

### `PestReporter`

Custom vitest reporter for pest metrics.

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    reporters: ['default', '@heilgar/pest-vitest/reporter'],
  },
});
```

Options:

| Option | Type | Default | Description |
|---|---|---|---|
| `verbose` | `boolean` | `false` | Show judge reasoning in console |
| `showCost` | `boolean` | `true` | Display estimated cost |
| `logFile` | `string \| false` | `"pest-log.json"` | JSON log path |
| `htmlFile` | `string \| false` | `"pest-report.html"` | HTML report path |

---

## @heilgar/pest-jest

For jest-based test files.

### Setup

```typescript
// jest.config.ts
export default {
  setupFilesAfterFramework: ['@heilgar/pest-jest/setup'],
};
```

### Exports

`send`, `createProvider`, `createProviders`, `loadConfig`, `defineConfig`, `assertConsistent`, `setJudge`, `pestMatchers`, `PestReporter` — same signatures as `@heilgar/pest-vitest`.

Jest does not re-export `sendAgentic` or `zodTool` — import those from `@heilgar/pest-core` if needed.

Jest now includes full test lifecycle hooks and accumulator support, matching vitest parity for matcher recording.

---

## @heilgar/pest-playwright

For Playwright E2E tests with LLM-judged matchers on strings/locators.

### Setup

```typescript
// playwright.config.ts or global-setup.ts
import { setJudge, createProvider } from '@heilgar/pest-playwright';

const judge = createProvider({ name: 'claude', type: 'anthropic', model: 'claude-sonnet-4-20250514' });
setJudge(judge);
```

```typescript
// In your global setup, also import the setup file:
import '@heilgar/pest-playwright/setup';
```

### Available matchers

Only LLM-judged matchers — deterministic matchers don't apply to DOM text:

```typescript
await expect(page.locator('.response')).toMatchSemanticMeaning("expected meaning");
await expect(page.locator('.response')).toSatisfyCriteria("is helpful and concise");
await expect(page.locator('.response')).toBeClassifiedAs("on_topic");
await expect(page.locator('.response')).toNotDisclose("system prompt");
```

Also works on plain strings:

```typescript
await expect("some text").toMatchSemanticMeaning("expected meaning");
```

---

## @heilgar/pest-core

Lower-level API. Used by extensions and directly for programmatic use.

### `defineConfig(config)`

```typescript
import { defineConfig } from '@heilgar/pest-core';

export default defineConfig({
  providers: ProviderConfig[];    // Required
  judge?: {
    provider: string;             // Which provider judges LLM-judged matchers
  };
  pricing?: Record<string, {      // Custom model pricing
    inputCentsPer1M: number;
    outputCentsPer1M: number;
  }>;
});
```

### `send(provider, message, options?)`

```typescript
import { send } from '@heilgar/pest-core';

const res = await send(provider, 'Hello', {
  systemPrompt: 'You are a helpful assistant',
  tools: [...],
  temperature: 0.7,
  maxTokens: 1000,
  responseFormat: 'json',
});
```

### `sendAgentic(provider, message, options?)`

Multi-turn agentic loop. Executes tool calls via a `ToolExecutor` callback and continues until the model responds with text or `maxSteps` is reached. All tool calls across steps are accumulated in the response.

```typescript
import { sendAgentic } from '@heilgar/pest-core';

const res = await sendAgentic(provider, 'Book a flight to Paris', {
  systemPrompt: 'You are a travel agent.',
  tools: [...],
  executor: async (name, args) => {
    return { status: 'booked' };
  },
  maxSteps: 10, // default: 10
});
```

### `zodTool(name, description, schema)`

Create a `ToolDefinition` from a Zod schema. Requires `zod` as a peer dependency.

```typescript
import { zodTool } from '@heilgar/pest-core';
import { z } from 'zod';

const tool = zodTool('search_flights', 'Search for flights', z.object({
  destination: z.string(),
  date: z.string().optional(),
}));
```

### `createProvider(config)` / `createProviders(configs)`

```typescript
import { createProvider, createProviders } from '@heilgar/pest-core';

const provider = createProvider({ name: 'gpt4o', type: 'openai', model: 'gpt-4o' });
const providers = createProviders([...configs]); // Returns Map<string, Provider>
```

### `loadConfig(cwd?)` / `loadEnv(cwd?)`

```typescript
import { loadConfig, loadEnv } from '@heilgar/pest-core';

loadEnv();                        // Load .env and .env.local
const config = await loadConfig(); // Load and validate pest.config.ts
```

### Pricing API

```typescript
import { setPricing, getPricing, resetPricing, estimateCostCents } from '@heilgar/pest-core';

// Override pricing for specific models
setPricing({
  'my-custom-model': { inputCentsPer1M: 100, outputCentsPer1M: 300 },
});

// Get pricing for a model (custom → default → fallback)
const pricing = getPricing('gpt-4o');

// Estimate cost in cents
const cost = estimateCostCents('gpt-4o', 1000, 500); // model, inputTokens, outputTokens

// Reset to defaults
resetPricing();
```

Built-in pricing includes: GPT-4o, GPT-4o-mini, GPT-4.1, o1/o3, Claude Sonnet/Opus/Haiku, Gemini 2.0/2.5, Grok 3 variants.

### Judge API

```typescript
import { setJudge, getJudge, resolveJudge } from '@heilgar/pest-core';

// Set global judge provider
setJudge(provider);

// Get global judge (returns null if not set)
const judge = getJudge();

// Resolve judge from options or global (throws if neither available)
const judge = resolveJudge({ judge: optionalOverride });
```

### Helper functions (CLI bridge)

```typescript
import { useProvider, useSystemPrompt } from '@heilgar/pest-core';

// Resolve provider from PEST_PROVIDER env + pest.config.ts
const provider = await useProvider('fallback-name');

// Resolve system prompt with env override
const systemPrompt = useSystemPrompt('default prompt...');
```

---

## Types

### `PestResponse`

Returned by `send()`:

```typescript
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
```

### `ToolCall`

```typescript
interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}
```

### `ToolDefinition`

```typescript
interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}
```

### `ProviderConfig`

```typescript
interface ProviderConfig {
  name: string;
  type: 'openai' | 'anthropic' | 'gemini' | 'xai' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
}
```

### `Provider`

```typescript
interface Provider {
  name: string;
  model: string;
  call(options: ProviderRequestOptions): Promise<ProviderResponse>;
}
```

### `MatcherResult`

```typescript
interface MatcherResult {
  pass: boolean;
  message: string;
  score?: number;
  reasoning?: string;
  metadata?: Record<string, unknown>;
}
```

### `ModelPricing`

```typescript
interface ModelPricing {
  inputCentsPer1M: number;
  outputCentsPer1M: number;
}
```
