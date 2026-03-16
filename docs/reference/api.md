::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# API Reference

## Package overview

| Package | Purpose |
|---------|---------|
| `@heilgar/pest-core` | Providers, config, `send()`, matchers logic, evaluators, tuner, cache |
| `@heilgar/pest-vitest` | vitest plugin + `expect.extend()` matchers |
| `@heilgar/pest-jest` | jest `expect.extend()` matchers + setup |
| `@heilgar/pest-cli` | CLI: `compare`, `qa`, `tune`, `install` |
| `pest` | Meta-package: re-exports `@heilgar/pest-core` + `@heilgar/pest-vitest` |

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

### `getProvider(name)`

Resolve a provider defined in `pest.config.ts` by name.

```typescript
import { getProvider } from '@heilgar/pest-vitest';

const provider = getProvider('gpt-4o');
```

### `setJudgeProvider(provider)`

Override the judge provider for the current test file.

```typescript
import { setJudgeProvider } from '@heilgar/pest-vitest';

setJudgeProvider(provider);
```

### `pestPlugin(options?)`

vitest plugin. Import in `vitest.config.ts`.

```typescript
import { pestPlugin } from '@heilgar/pest-vitest/plugin';

// vitest.config.ts
export default defineConfig({
  plugins: [pestPlugin({ config: './pest.config.ts' })],
});
```

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

`send`, `createProvider`, `getProvider`, `setJudgeProvider` — same signatures as `@heilgar/pest-vitest`.

---

## @heilgar/pest-core

Lower-level API. Used by the vitest/jest packages and directly for programmatic use.

### `defineConfig(config)`

```typescript
import { defineConfig } from '@heilgar/pest-core';

export default defineConfig({
  providers: ProviderConfig[];
  judge?: {
    provider: string;
    temperature?: number;
    threshold?: number;
  };
  limits?: {
    concurrency?: number;
    requestsPerMinute?: number;
    timeout?: number;
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
  prompts?: {
    judge?: string;
    similarity?: string;
    qa?: string;
    optimizer?: string;
    compressor?: string;
  };
});
```

### `createProvider(config)` / `getProvider(name)`

Same as the vitest package — re-exported from core.

### `send(provider, message, options?)`

Same as the vitest package — re-exported from core.

### Prompts API

```typescript
import { setPrompts, getPrompts, resetPrompts, defaultPrompts } from '@heilgar/pest-core';

// Override pest's internal prompts
setPrompts({ judge: 'Your custom judge prompt...' });

// Get currently active prompts
const prompts = getPrompts();

// Restore defaults
resetPrompts();

// Extend rather than replace
setPrompts({
  judge: `${defaultPrompts.judge}\n\nBe strict about factual accuracy.`,
});
```

### `pestMatchers`

The raw matcher object for manual `expect.extend()` registration.

```typescript
import { pestMatchers } from '@heilgar/pest-core';

expect.extend(pestMatchers);
```

### `generateTestCases(provider, systemPrompt, options?)`

Generate test cases using LLM-as-QA.

```typescript
import { generateTestCases } from '@heilgar/pest-core';

const cases = await generateTestCases(provider, SYSTEM_PROMPT, {
  categories: ['happy_path', 'edge_cases', 'adversarial'],
  count: 10,
  tools: myTools,
});
```

### `optimizePrompt(tuner, prompt, testFn, provider, options?)`

Iteratively optimize a prompt.

```typescript
import { optimizePrompt } from '@heilgar/pest-core';

const result = await optimizePrompt(tuner, originalPrompt, testFn, provider, {
  maxIterations: 5,
  variants: 3,
});

result.best.prompt;    // Best optimized prompt
result.best.passRate;  // Pass rate achieved
result.improved;       // Whether improvement was found
```

### `compressPrompt(compressor, prompt, testFn, provider, options?)`

Compress a prompt while maintaining test pass rate.

```typescript
import { compressPrompt } from '@heilgar/pest-core';

const result = await compressPrompt(compressor, originalPrompt, testFn, provider, {
  targetReduction: 0.3,
  minPassRate: 1,
});

result.compressed.prompt;
result.reductionPercent;
result.passRateMaintained;
```

### `buildComparisonTable(results)`

Build a ranked comparison from `send()` results across providers.

```typescript
import { buildComparisonTable } from '@heilgar/pest-core';

const stats = buildComparisonTable(results);
// [{ provider, passed, failed, total, passRate, avgDurationMs }]
```

### `buildJsonReport(results)` / `formatJsonReport(results)`

```typescript
import { buildJsonReport, formatJsonReport } from '@heilgar/pest-core';

const report = buildJsonReport(results);
const json = formatJsonReport(results);   // Pretty-printed JSON string
```

### `buildHtmlReport(results)`

```typescript
import { buildHtmlReport } from '@heilgar/pest-core';

const html = buildHtmlReport(results);
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
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  provider: string;
  model: string;
}
```

### `ToolCall`

```typescript
interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
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

### `GeneratedTestCase`

```typescript
interface GeneratedTestCase {
  name: string;
  message: string;
  category: 'happy_path' | 'edge_cases' | 'adversarial' | 'tool_misuse' | 'refusal';
  criteria: string;
  expectedTools?: string[];
}
```

### `PestPrompts`

```typescript
interface PestPrompts {
  judge: string;
  similarity: string;
  qa: string;
  optimizer: string;
  compressor: string;
}
```
