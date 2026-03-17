# Configuration

pest uses a `pest.config.ts` file in your project root. It defines providers and judge settings.

## Minimal config

```ts
// pest.config.ts
import { defineConfig } from "@heilgar/pest-core";

export default defineConfig({
  providers: [
    { name: "gpt4o", type: "openai", model: "gpt-4o" },
  ],
});
```

## Full config

```ts
// pest.config.ts
import { defineConfig } from "@heilgar/pest-core";

export default defineConfig({
  // LLM providers available for testing
  providers: [
    {
      name: "gpt4o",
      type: "openai",
      model: "gpt-4o",
      apiKey: process.env.OPENAI_API_KEY, // optional, reads env by default
      temperature: 0, // default temperature for this provider
    },
    {
      name: "claude",
      type: "anthropic",
      model: "claude-sonnet-4-20250514",
    },
    {
      name: "gemini",
      type: "gemini",
      model: "gemini-2.0-flash",
    },
    {
      name: "grok",
      type: "xai",
      model: "grok-3",
    },
    {
      name: "local",
      type: "ollama",
      model: "llama3",
      baseUrl: "http://localhost:11434/v1", // default
    },
  ],

  // Judge provider for LLM-judged matchers
  judge: {
    provider: "claude", // must match a provider name above
  },

  // Custom model pricing (overrides built-in defaults)
  pricing: {
    "my-custom-model": {
      inputCentsPer1M: 100,
      outputCentsPer1M: 300,
    },
  },

});
```

## Providers

### Provider types

| Type | SDK | Env variable |
|---|---|---|
| `openai` | `openai` | `OPENAI_API_KEY` |
| `anthropic` | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY` |
| `gemini` | `@google/genai` | `GOOGLE_API_KEY` |
| `xai` | `openai` (compatible) | `XAI_API_KEY` |
| `ollama` | `openai` (compatible) | none (local) |

### API key resolution

Keys are resolved in order:
1. Explicit `apiKey` field in provider config
2. Environment variable (from shell, CI, or `.env` files)

pest automatically loads `.env` files when you call `createProvider()` or `loadConfig()`. See [Environment variables](#environment-variables) below.

### Custom base URLs

For self-hosted or proxy setups:

```ts
{
  name: "custom",
  type: "openai",
  model: "gpt-4o",
  baseUrl: "https://my-proxy.example.com/v1",
  apiKey: "my-key",
}
```

## Judge

The judge is the LLM that evaluates responses for LLM-judged matchers (`toMatchSemanticMeaning`, `toSatisfyCriteria`, `toBeClassifiedAs`, `toNotDisclose`).

```ts
judge: {
  provider: "claude", // name of a provider defined above
}
```

**Which model to use as judge?** A capable model (GPT-4o, Claude Sonnet, Gemini Pro) gives more reliable evaluations. Using a weaker model as judge produces less consistent results.

The judge can be the same provider you're testing, or a different one. Using a different provider avoids self-evaluation bias.

### Per-assertion override

Any LLM-judged matcher accepts a `judge` option to override the default:

```ts
const customJudge = createProvider({
  name: "judge",
  type: "anthropic",
  model: "claude-sonnet-4-20250514",
});

await expect(res).toMatchSemanticMeaning("expected", {
  judge: customJudge,
});
```

## Using config in tests

The config file is optional. In tests, you can create providers directly:

```ts
import { createProvider } from "@heilgar/pest-core";

const provider = createProvider({
  name: "gpt4o",
  type: "openai",
  model: "gpt-4o",
});
```

To load config programmatically (for judge setup, etc.):

```ts
import { loadConfig, createProvider } from "@heilgar/pest-core";

const config = await loadConfig();
const providers = config.providers.map(createProvider);
```

## Environment variables

### `.env` files

pest automatically loads environment variables from `.env` files in your project root. Supported files, in priority order:

| File | Priority | Purpose |
|---|---|---|
| Shell / CI env | Highest | Never overwritten by `.env` files |
| `.env.local` | High | Local overrides, **add to `.gitignore`** |
| `.env` | Low | Shared defaults, safe to commit (without secrets) |

Loading happens automatically when you call `createProvider()` or `loadConfig()`. It's idempotent — files are only read once.

If you need env loaded before provider creation (e.g. for conditional test logic), call `loadEnv()` explicitly in your setup file:

::: code-group

```ts [vitest]
// vitest.setup.ts
import { loadEnv } from "@heilgar/pest-core";
import { pestMatchers } from "@heilgar/pest-vitest";
import { expect } from "vitest";

loadEnv(); // loads .env and .env.local into process.env
expect.extend(pestMatchers);
```

```ts [jest]
// jest.setup.ts
import { loadEnv } from "@heilgar/pest-core";
import { pestMatchers } from "@heilgar/pest-jest";

loadEnv(); // loads .env and .env.local into process.env
expect.extend(pestMatchers);
```

```ts [playwright]
// playwright.global-setup.ts
import { loadEnv } from "@heilgar/pest-core";
import { setJudge } from "@heilgar/pest-playwright";
import { createProvider, loadConfig } from "@heilgar/pest-core";

export default async function globalSetup() {
  loadEnv(); // loads .env and .env.local into process.env
  const config = await loadConfig();
  if (config.judge) {
    setJudge(createProvider({
      name: config.judge.provider,
      type: "anthropic",
      model: "claude-sonnet-4-20250514",
    }));
  }
}
```

:::

### API keys

Create a `.env.local` file (gitignored) with your API keys:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
XAI_API_KEY=xai-...
```

Or use `.env` if your team shares the same test keys:

```env
# .env — committed, shared across team
OPENAI_API_KEY=sk-test-shared-key
```

```env
# .env.local — gitignored, personal overrides
OPENAI_API_KEY=sk-my-personal-key
```

### Provider key mapping

| Provider type | Environment variable |
|---|---|
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `gemini` | `GOOGLE_API_KEY` |
| `xai` | `XAI_API_KEY` |
| `ollama` | none (local) |

You don't need to pass `apiKey` in provider config — the SDKs read these env vars automatically once they're loaded into `process.env`.
