# Configuration

pest uses a `pest.config.ts` file in your project root. It only holds provider credentials and global settings — test logic lives in test files.

## Full reference

```typescript
// pest.config.ts
import { defineConfig } from 'pest';

export default defineConfig({
  // --- Providers (required) ---
  providers: [
    {
      name: 'gpt-4o',
      type: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com',  // Optional: custom endpoint
      temperature: 0,                      // Optional: default 0
      maxTokens: 4096,                     // Optional: max response tokens
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
    provider: 'gpt-4o',            // Which provider judges responses
    temperature: 0,                  // Judges should be deterministic
    maxRetries: 2,                   // Retry on failures
  },

  // --- QA ---
  qa: {
    provider: 'claude-sonnet',       // Which provider generates test cases
    casesPerPrompt: 10,
  },

  // --- Tuner ---
  tuner: {
    provider: 'claude-sonnet',
    maxIterations: 5,
    compressionTarget: 0.7,
    strategy: 'iterative',          // 'iterative' | 'evolutionary'
  },

  // --- Execution limits ---
  limits: {
    concurrency: 3,                  // Max parallel LLM requests
    requestsPerMinute: 30,           // Rate limit
    maxTokensPerRun: 100_000,        // Budget cap
    timeout: 30_000,                 // Per-request timeout (ms)
  },

  // --- Cache ---
  cache: {
    enabled: true,
    ttl: 86400,                      // 24h in seconds
    directory: '.pest-cache',
  },

  // --- Reporter ---
  reporter: {
    format: ['console', 'json'],     // 'console' | 'json' | 'html'
    outputDir: 'reports',
    verbose: false,
  },

  // --- Test discovery ---
  tests: {
    pattern: '**/*.pest.ts',         // Glob pattern
  },
});
```

## Minimal config

Only `providers` is required:

```typescript
import { defineConfig } from 'pest';

export default defineConfig({
  providers: [
    {
      name: 'gpt-4o',
      type: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
    },
  ],
});
```

Defaults: judge uses the first provider, tests match `**/*.pest.ts`, console output, caching on.

## Config file formats

pest looks for config files in this order:

1. `pest.config.ts`
2. `pest.config.js`
3. `pest.config.yaml`
4. `pest.config.json`

TypeScript is recommended — you get type checking, autocomplete, and access to `process.env`.

## Environment variables

Use `process.env` directly in `.ts` config. pest auto-loads `.env` files from the project root.

```typescript
providers: [
  {
    name: 'gpt-4o',
    type: 'openai',
    apiKey: process.env.OPENAI_API_KEY,  // From .env file
  },
],
```

## Overriding config per test suite

Use the `describe` options to override settings for specific suites:

```typescript
describe('My Suite', {
  systemPrompt: PROMPT,
  providers: ['gpt-4o'],           // Only run against gpt-4o
  judge: { provider: 'claude-sonnet' },  // Different judge
  temperature: 0.2,
}, () => {
  // ...
});
```
