# Configuration

pest uses an optional config file in your project root. It defines provider credentials and judge settings — test logic lives in test files.

## Config file

```typescript
// pest.config.ts
import { defineConfig } from '@heilgar/pest-core';

export default defineConfig({
  // --- Providers (required) ---
  providers: [
    {
      name: 'gpt4o',
      type: 'openai',
      model: 'gpt-4o',
      // apiKey reads OPENAI_API_KEY from env automatically
      temperature: 0,
    },
    {
      name: 'claude',
      type: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    },
    {
      name: 'gemini',
      type: 'gemini',
      model: 'gemini-2.5-flash',
    },
    {
      name: 'grok',
      type: 'xai',
      model: 'grok-4',
    },
    {
      name: 'llama-local',
      type: 'ollama',
      model: 'llama3.2',
    },
  ],

  // --- Judge (optional) ---
  judge: {
    provider: 'gpt4o',       // which provider judges LLM-judged matchers
  },

  // --- Custom prompts (optional) ---
  prompts: {
    judge: '...',             // custom judge evaluation prompt
    similarity: '...',        // custom semantic similarity prompt
  },

  // --- Model pricing (optional) ---
  pricing: {
    'my-custom-model': {
      inputCentsPer1M: 100,
      outputCentsPer1M: 300,
    },
  },
});
```

## When do you need a config file?

- **Without config:** Create providers directly with `createProvider()`. Set the judge via `setJudge()` in your setup file. This is fine for simple projects.
- **With config:** Define providers once, reference by name via `useProvider()`. Judge auto-resolves from config. Better for multi-provider setups or CI pipelines.

## Minimal config

Only `providers` is required:

```typescript
import { defineConfig } from '@heilgar/pest-core';

export default defineConfig({
  providers: [
    { name: 'gpt4o', type: 'openai', model: 'gpt-4o' },
  ],
});
```

## Config file formats

pest looks for config files in this order:

1. `pest.config.ts`
2. `pest.config.js`
3. `pest.config.mjs`

TypeScript is recommended — you get type checking and autocomplete.

## Environment variables

API keys are loaded from `.env` and `.env.local` files automatically (shell env takes precedence):

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
XAI_API_KEY=xai-...
```

You can also set `apiKey` explicitly in provider config.

## Custom prompts

pest uses LLM prompts internally for judging. Override in config or programmatically:

```typescript
// In config
export default defineConfig({
  providers: [...],
  prompts: {
    judge: 'You are a strict evaluator...',
  },
});

// Or programmatically
import { setPrompts } from '@heilgar/pest-core';
setPrompts({ judge: 'Be extra strict about factual accuracy.' });
```

| Key | Used by | Purpose |
|-----|---------|---------|
| `judge` | `toSatisfyCriteria()` | Scores responses against criteria (0-1) |
| `similarity` | `toMatchSemanticMeaning()` | Scores semantic similarity |

## Model pricing

pest includes built-in pricing for common models. Override for custom or self-hosted models:

```typescript
export default defineConfig({
  providers: [...],
  pricing: {
    'my-finetuned-model': { inputCentsPer1M: 500, outputCentsPer1M: 1500 },
  },
});
```

Pricing is used by reporters to estimate cost.

## Judge resolution

When an LLM-judged matcher runs, the judge provider is resolved in this order:

1. **Per-assertion override** — `{ judge: provider }` passed in matcher options
2. **Global `setJudge()`** — set in your setup file
3. **Error** — throws with a message explaining how to configure
