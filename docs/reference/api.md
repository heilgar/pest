# API Reference

## Test API

### `describe(name, options, fn)`

```typescript
import { describe } from 'pest';

describe('Suite Name', {
  systemPrompt: string;             // Required
  tools?: ToolDefinition[];          // Optional
  providers?: string[];              // Optional: limit to specific providers
  judge?: { provider?: string };     // Optional: override judge
  temperature?: number;              // Optional
}, () => {
  // tests
});
```

### `test(name, fn, options?)`

```typescript
import { test } from 'pest';

test('test name', async ({ send, conversation }) => {
  const res = await send('message');
  expect(res).toContain('expected');
}, { timeout: 30_000 });
```

### `test.each(cases)`

```typescript
test.each([
  { input: 'Refund #123', tool: 'process_refund' },
  { input: 'Check #456', tool: 'check_order' },
])('$input calls $tool', async ({ send }, { input, tool }) => {
  const res = await send(input);
  expect(res).toCallTool(tool);
});
```

### `test.skip(name, fn)` / `test.only(name, fn)`

Skip or isolate tests.

### Lifecycle hooks

```typescript
beforeAll(async () => {});
afterAll(async () => {});
beforeEach(async () => {});
afterEach(async ({ result }) => {});
```

## Test Context

The callback receives a context object:

```typescript
interface TestContext {
  send(message: string): Promise<PestResponse>;
  conversation(messages: Message[]): Promise<void>;
  provider: string;  // Current provider name
}
```

## `PestResponse`

Returned by `send()`:

```typescript
interface PestResponse {
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

## Matchers

### Text

```typescript
expect(res).toContain(substring: string, options?: { caseSensitive?: boolean })
expect(res).toMatch(pattern: RegExp)
expect(res).toEqual(expected: string)
expect(res).toMatchSchema(schema: JSONSchema)
expect(res).toHaveLength(options: { min?: number; max?: number })
```

### Tool calls

```typescript
expect(res).toCallTool(name: string)
expect(res).toCallAnyTool()
expect(res).toCallToolWith(name: string, args: Record<string, unknown>)
expect(res).toCallToolWithMatch(name: string, partial: Record<string, unknown>)
expect(res).toCallToolWithSchema(name: string, schema: JSONSchema)
expect(res).toHaveToolCallCount(count: number, tool?: string)
expect(res).toCallToolsInOrder(names: string[], options?: { strict?: boolean })
expect(res).toCallToolAtIndex(index: number, name: string, args?: Record<string, unknown>)
```

### Judge (async)

```typescript
await expect(res).toPassJudge(
  criteria: string | string[],
  options?: { threshold?: number; provider?: string }
)
await expect(res).toBeSemanticallySimilar(
  expected: string,
  options?: { threshold?: number }
)
```

### Metadata

```typescript
expect(res).toRespondWithin(ms: number)
expect(res).toCostLessThan(dollars: number)
```

### Negation

All matchers support `.not`:

```typescript
expect(res).not.toCallTool('delete_account')
expect(res).not.toCallAnyTool()
expect(res).not.toContain('error')
```

## Configuration API

### `defineConfig(config)`

```typescript
import { defineConfig } from 'pest';

export default defineConfig({
  providers: ProviderConfig[];
  judge?: JudgeConfig;
  qa?: QAConfig;
  tuner?: TunerConfig;
  limits?: LimitsConfig;
  cache?: CacheConfig;
  reporter?: ReporterConfig;
  tests?: { pattern?: string };
});
```

### `defineProvider(provider)`

Register a custom provider:

```typescript
import { defineProvider } from 'pest';

const myProvider = defineProvider({
  name: 'my-llm',
  async complete(request) {
    return { text: '', toolCalls: [], usage: { ... }, latencyMs: 0, raw: null };
  },
});
```

## Programmatic API

### `pest.run(options)`

```typescript
import { run } from 'pest';

const results = await run({
  tests: './tests/',
  providers: ['gpt-4o'],
});

results.summary; // { total, passed, failed, avgScore }
```

### `pest.compare(options)`

```typescript
import { compare } from 'pest';

const results = await compare({
  tests: './tests/support.pest.ts',
  providers: ['gpt-4o', 'claude-sonnet'],
  tag: 'v2',
});

results.rankings; // ProviderRanking[]
```

### `pest.qa(options)`

```typescript
import { qa } from 'pest';

const results = await qa({
  systemPrompt: PROMPT,
  tools: TOOLS,
  behavior: '...',
  cases: 20,
});

results.weakSpots; // string[]
```

### `pest.tune(options)`

```typescript
import { tune } from 'pest';

const results = await tune({
  tests: './tests/support.pest.ts',
  iterations: 5,
  compress: true,
});

results.optimized;  // { prompt, tokens, score }
results.compressed; // { prompt, tokens, score }
```

## Types

### `ToolDefinition`

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ParameterDefinition>;
}

interface ParameterDefinition {
  type: string;
  required?: boolean;
  description?: string;
  enum?: string[];
  items?: ParameterDefinition;
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
  maxTokens?: number;
}
```

### `Message`

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```
