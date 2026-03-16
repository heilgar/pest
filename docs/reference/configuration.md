::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# Configuration

pest uses a config file in your project root. It holds provider credentials and global settings — test logic lives in test files.

## Config file

<PluginBlock plugin="vitest">

```typescript
// pest.config.ts
import { defineConfig } from '@pest/vitest'

export default defineConfig({
  // --- Providers (required) ---
  providers: [
    {
      name: 'gpt-4o',
      type: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com',  // Optional: custom endpoint
      temperature: 0,
    },
    {
      name: 'claude-sonnet',
      type: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    {
      name: 'gemini-2',
      type: 'gemini',
      model: 'gemini-2.5-flash',
      apiKey: process.env.GOOGLE_AI_API_KEY,
    },
    {
      name: 'grok-4',
      type: 'xai',
      model: 'grok-4',
      apiKey: process.env.XAI_API_KEY,
    },
    {
      name: 'llama-local',
      type: 'ollama',
      model: 'llama3.2',
      baseUrl: 'http://localhost:11434',
    },
  ],

  // --- Judge ---
  judge: {
    provider: 'gpt-4o',
    temperature: 0,
    threshold: 0.7,
  },

  // --- Execution limits ---
  limits: {
    concurrency: 3,
    requestsPerMinute: 30,
    timeout: 30_000,
  },

  // --- Cache ---
  cache: {
    enabled: true,
    ttl: 86400,
  },

  // --- Custom prompts ---
  prompts: {
    judge: '...',
    similarity: '...',
    qa: '...',
    optimizer: '...',
    compressor: '...',
  },

  workers: 4,
  testMatch: ['**/*.pest.ts'],
})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
// pest.config.ts
import { defineConfig } from '@pest/jest'

export default defineConfig({
  // --- Providers (required) ---
  providers: [
    {
      name: 'gpt-4o',
      type: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com',  // Optional: custom endpoint
      temperature: 0,
    },
    {
      name: 'claude-sonnet',
      type: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    {
      name: 'gemini-2',
      type: 'gemini',
      model: 'gemini-2.5-flash',
      apiKey: process.env.GOOGLE_AI_API_KEY,
    },
    {
      name: 'grok-4',
      type: 'xai',
      model: 'grok-4',
      apiKey: process.env.XAI_API_KEY,
    },
    {
      name: 'llama-local',
      type: 'ollama',
      model: 'llama3.2',
      baseUrl: 'http://localhost:11434',
    },
  ],

  // --- Judge ---
  judge: {
    provider: 'gpt-4o',
    temperature: 0,
    threshold: 0.7,
  },

  // --- Execution limits ---
  limits: {
    concurrency: 3,
    requestsPerMinute: 30,
    timeout: 30_000,
  },

  // --- Cache ---
  cache: {
    enabled: true,
    ttl: 86400,
  },

  // --- Custom prompts ---
  prompts: {
    judge: '...',
    similarity: '...',
    qa: '...',
    optimizer: '...',
    compressor: '...',
  },

  workers: 4,
  testMatch: ['**/*.pest.ts'],
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```yaml
# pest.config.yaml
providers:
  - name: gpt-4o
    type: openai
    model: gpt-4o
    api_key: ${OPENAI_API_KEY}
    temperature: 0

  - name: claude-sonnet
    type: anthropic
    model: claude-sonnet-4-20250514
    api_key: ${ANTHROPIC_API_KEY}

  - name: gemini-2
    type: gemini
    model: gemini-2.5-flash
    api_key: ${GOOGLE_AI_API_KEY}

  - name: grok-4
    type: xai
    model: grok-4
    api_key: ${XAI_API_KEY}

  - name: llama-local
    type: ollama
    model: llama3.2
    base_url: http://localhost:11434

judge:
  provider: gpt-4o
  temperature: 0
  threshold: 0.7

limits:
  concurrency: 3
  requests_per_minute: 30
  timeout: 30000

cache:
  enabled: true
  ttl: 86400

workers: 4
test_match:
  - "tests/**/*.pest.py"
```

</PluginBlock>

## Minimal config

Only `providers` is required:

<PluginBlock plugin="vitest">

```typescript
import { defineConfig } from '@pest/vitest'

export default defineConfig({
  providers: [
    {
      name: 'gpt-4o',
      type: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
    },
  ],
})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { defineConfig } from '@pest/jest'

export default defineConfig({
  providers: [
    {
      name: 'gpt-4o',
      type: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
    },
  ],
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```yaml
providers:
  - name: gpt-4o
    type: openai
    model: gpt-4o
    api_key: ${OPENAI_API_KEY}
```

</PluginBlock>

Defaults: judge uses the first provider, console output.

## Config file formats

<PluginBlock :plugins="['vitest', 'jest']">

pest looks for config files in this order:

1. `pest.config.ts`
2. `pest.config.js`
3. `pest.config.mjs`

TypeScript is recommended — you get type checking, autocomplete, and access to `process.env`.

</PluginBlock>

<PluginBlock plugin="pytest">

pest looks for `pest.config.yaml` in the project root. Environment variables can be referenced with `${VAR_NAME}` syntax.

</PluginBlock>

## Custom prompts

pest uses LLM prompts internally for judging, QA generation, and optimization. You can override any of them:

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
export default defineConfig({
  providers: [...],
  prompts: {
    judge: `You are a strict evaluator...`,
  },
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```yaml
prompts:
  judge: "You are a strict evaluator..."
```

</PluginBlock>

Available prompt keys:

| Key | Used by | Purpose |
|-----|---------|---------|
| `judge` | `toPassJudge()` | Scores responses against criteria (0.0-1.0) |
| `similarity` | `toBeSemanticallySimilar()` | Scores semantic similarity (0.0-1.0) |
| `qa` | `generateTestCases()` | Generates edge cases and test scenarios |
| `optimizer` | `optimizePrompt()` | Generates improved prompt variants |
| `compressor` | `compressPrompt()` | Compresses prompts while preserving behavior |

<PluginBlock :plugins="['vitest', 'jest']">

You can also override prompts programmatically:

```typescript
import { setPrompts, defaultPrompts } from '@pest/vitest'  // or @pest/jest

setPrompts({
  judge: `${defaultPrompts.judge}\n\nBe extra strict about factual accuracy.`,
})
```

</PluginBlock>

## Overriding config per test suite

<PluginBlock :plugins="['vitest', 'jest']">

Use the `describe` options to override settings for specific suites:

```typescript
describe('My Suite', {
  systemPrompt: PROMPT,
  providers: ['gpt-4o'],
  temperature: 0.2,
}, () => {
  // ...
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
with describe("My Suite",
    system_prompt=PROMPT,
    providers=["gpt-4o"],
    temperature=0.2,
) as suite:
    pass
```

</PluginBlock>
