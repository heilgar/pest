# Getting Started

This guide walks you through setting up pest and writing your first prompt test.

## Prerequisites

- Node.js 18+
- A test runner: [vitest](https://vitest.dev/), [jest](https://jestjs.io/), or [Playwright](https://playwright.dev/)
- An API key for at least one LLM provider (OpenAI, Anthropic, Google, etc.)

## Installation

::: code-group

```bash [vitest]
npm install -D @heilgar/pest-vitest @heilgar/pest-core vitest
```

```bash [jest]
npm install -D @heilgar/pest-jest @heilgar/pest-core jest
```

```bash [playwright]
npm install -D @heilgar/pest-playwright @heilgar/pest-core @playwright/test
```

:::

## Register matchers

::: code-group

```ts [vitest]
// vitest.setup.ts
import { loadEnv } from "@heilgar/pest-core";
import { pestMatchers } from "@heilgar/pest-vitest";
import { expect } from "vitest";

loadEnv();
expect.extend(pestMatchers);
```

```ts [jest]
// jest.setup.ts
import { loadEnv } from "@heilgar/pest-core";
import { pestMatchers } from "@heilgar/pest-jest";

loadEnv();
expect.extend(pestMatchers);
```

```ts [playwright]
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { pestMatchers } from "@heilgar/pest-playwright";
import { expect } from "@playwright/test";

expect.extend(pestMatchers);

export default defineConfig({
  globalSetup: "./playwright.global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
  },
  timeout: 60_000,
});
```

:::

Then reference the setup file in your config:

::: code-group

```ts [vitest]
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

```json [jest]
// jest.config.json
{
  "setupFiles": ["./jest.setup.ts"]
}
```

```ts [playwright]
// playwright.global-setup.ts
import { setJudge } from "@heilgar/pest-playwright";
import { createProvider, loadConfig } from "@heilgar/pest-core";

export default async function globalSetup() {
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

## Set up providers

Create a `pest.config.ts` in your project root:

```ts
// pest.config.ts
import { defineConfig } from "@heilgar/pest-core";

export default defineConfig({
  providers: [
    {
      name: "gpt4o",
      type: "openai",
      model: "gpt-4o",
      // reads OPENAI_API_KEY from env by default
    },
  ],
});
```

Set your API key in a `.env.local` file (add to `.gitignore`):

```env
OPENAI_API_KEY=sk-...
```

pest loads `.env` and `.env.local` files automatically when creating providers — no extra setup needed.

## Write your first test

::: code-group

```ts [vitest]
// tests/greeting.test.ts
import { describe, test, expect } from "vitest";
import { send, createProvider } from "@heilgar/pest-core";

const provider = createProvider({
  name: "gpt4o",
  type: "openai",
  model: "gpt-4o",
});

describe("greeting bot", () => {
  test("responds to hello", async () => {
    const res = await send(provider, "Hello!", {
      systemPrompt: "You are a friendly greeting bot.",
    });

    expect(res).toContainText("hello");
  }, 30_000); // LLM calls need longer timeouts
});
```

```ts [jest]
// tests/greeting.test.ts
import { describe, test, expect } from "@jest/globals";
import { send, createProvider } from "@heilgar/pest-core";

const provider = createProvider({
  name: "gpt4o",
  type: "openai",
  model: "gpt-4o",
});

describe("greeting bot", () => {
  test("responds to hello", async () => {
    const res = await send(provider, "Hello!", {
      systemPrompt: "You are a friendly greeting bot.",
    });

    expect(res).toContainText("hello");
  }, 30_000);
});
```

```ts [playwright]
// tests/greeting.spec.ts
import { test, expect } from "@playwright/test";

test("chat bot responds to hello", async ({ page }) => {
  await page.goto("/chat");
  await page.fill('[data-testid="chat-input"]', "Hello!");
  await page.click('[data-testid="send-button"]');

  const response = page.locator('[data-testid="chat-response"]');
  await response.waitFor();

  await expect(response).toMatchSemanticMeaning("a friendly greeting");
});
```

:::

Run it:

::: code-group

```bash [vitest]
npx vitest
```

```bash [jest]
npx jest
```

```bash [playwright]
npx playwright test
```

:::

## Add tool call assertions

<ExtensionBlock :extensions="['vitest', 'jest']">

Tool call assertions (`toContainToolCall`, `toCallToolsInOrder`, `toHaveToolCallCount`) are only available in vitest and jest. They operate on the raw LLM response object returned by `send()`, which is not available in Playwright E2E tests.

::: code-group

```ts [vitest]
// tests/weather.test.ts
import { describe, test, expect } from "vitest";
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
      name: "get_weather",
      description: "Get weather for a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
        },
        required: ["city"],
      },
    },
  },
];

test("calls weather tool for weather questions", async () => {
  const res = await send(provider, "What's the weather in Paris?", {
    systemPrompt: "You are a weather assistant. Use the get_weather tool.",
    tools,
  });

  expect(res).toContainToolCall("get_weather", { city: "Paris" });
}, 30_000);
```

```ts [jest]
// tests/weather.test.ts
import { describe, test, expect } from "@jest/globals";
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
      name: "get_weather",
      description: "Get weather for a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
        },
        required: ["city"],
      },
    },
  },
];

test("calls weather tool for weather questions", async () => {
  const res = await send(provider, "What's the weather in Paris?", {
    systemPrompt: "You are a weather assistant. Use the get_weather tool.",
    tools,
  });

  expect(res).toContainToolCall("get_weather", { city: "Paris" });
}, 30_000);
```

:::

</ExtensionBlock>

## Add LLM-judged assertions

For semantic checks, configure a judge provider in `pest.config.ts`:

```ts
// pest.config.ts
import { defineConfig } from "@heilgar/pest-core";

export default defineConfig({
  providers: [
    { name: "gpt4o", type: "openai", model: "gpt-4o" },
    { name: "claude", type: "anthropic", model: "claude-sonnet-4-20250514" },
  ],
  judge: {
    provider: "claude", // which provider evaluates assertions
  },
});
```

Then initialize the judge in your setup file:

::: code-group

```ts [vitest]
// vitest.setup.ts
import { pestMatchers, setJudge } from "@heilgar/pest-vitest";
import { createProvider, loadConfig } from "@heilgar/pest-core";
import { expect, beforeAll } from "vitest";

expect.extend(pestMatchers);

beforeAll(async () => {
  const config = await loadConfig();
  if (config.judge) {
    setJudge(createProvider({
      name: config.judge.provider,
      type: "anthropic",
      model: "claude-sonnet-4-20250514",
    }));
  }
});
```

```ts [jest]
// jest.setup.ts
import { pestMatchers, setJudge } from "@heilgar/pest-jest";
import { createProvider, loadConfig } from "@heilgar/pest-core";

expect.extend(pestMatchers);

beforeAll(async () => {
  const config = await loadConfig();
  if (config.judge) {
    setJudge(createProvider({
      name: config.judge.provider,
      type: "anthropic",
      model: "claude-sonnet-4-20250514",
    }));
  }
});
```

```ts [playwright]
// playwright.global-setup.ts
import { setJudge } from "@heilgar/pest-playwright";
import { createProvider, loadConfig } from "@heilgar/pest-core";

export default async function globalSetup() {
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

Now you can use LLM-judged matchers:

::: code-group

```ts [vitest]
// tests/semantic.test.ts
import { describe, test, expect } from "vitest";
import { send, createProvider } from "@heilgar/pest-core";

const provider = createProvider({
  name: "gpt4o",
  type: "openai",
  model: "gpt-4o",
});

test("responds with relevant information", async () => {
  const res = await send(provider, "What is the capital of France?");

  await expect(res).toMatchSemanticMeaning("Paris is the capital of France");
}, 30_000);

test("gives helpful response", async () => {
  const res = await send(provider, "How do I reset my password?", {
    systemPrompt: "You are a customer support agent.",
  });

  await expect(res).toSatisfyCriteria(
    "Response provides clear steps to reset a password"
  );
}, 30_000);
```

```ts [jest]
// tests/semantic.test.ts
import { describe, test, expect } from "@jest/globals";
import { send, createProvider } from "@heilgar/pest-core";

const provider = createProvider({
  name: "gpt4o",
  type: "openai",
  model: "gpt-4o",
});

test("responds with relevant information", async () => {
  const res = await send(provider, "What is the capital of France?");

  await expect(res).toMatchSemanticMeaning("Paris is the capital of France");
}, 30_000);

test("gives helpful response", async () => {
  const res = await send(provider, "How do I reset my password?", {
    systemPrompt: "You are a customer support agent.",
  });

  await expect(res).toSatisfyCriteria(
    "Response provides clear steps to reset a password"
  );
}, 30_000);
```

```ts [playwright]
// tests/semantic.spec.ts
import { test, expect } from "@playwright/test";

test("chat responds with capital city info", async ({ page }) => {
  await page.goto("/chat");
  await page.fill('[data-testid="chat-input"]', "What is the capital of France?");
  await page.click('[data-testid="send-button"]');

  const response = page.locator('[data-testid="chat-response"]');
  await response.waitFor();

  await expect(response).toMatchSemanticMeaning("Paris is the capital of France");
});

test("chat gives helpful password reset instructions", async ({ page }) => {
  await page.goto("/chat");
  await page.fill('[data-testid="chat-input"]', "How do I reset my password?");
  await page.click('[data-testid="send-button"]');

  const response = page.locator('[data-testid="chat-response"]');
  await response.waitFor();

  await expect(response).toSatisfyCriteria(
    "Response provides clear steps to reset a password"
  );
});
```

:::

## Timeouts

LLM calls are slow. Set a global timeout in your config:

::: code-group

```ts [vitest]
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30_000, // 30 seconds
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

```json [jest]
// jest.config.json
{
  "testTimeout": 30000,
  "setupFiles": ["./jest.setup.ts"]
}
```

```ts [playwright]
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { pestMatchers } from "@heilgar/pest-playwright";
import { expect } from "@playwright/test";

expect.extend(pestMatchers);

export default defineConfig({
  globalSetup: "./playwright.global-setup.ts",
  timeout: 60_000, // 60 seconds for E2E + LLM judge calls
  use: {
    baseURL: "http://localhost:3000",
  },
});
```

:::

## CLI-compatible tests

<ExtensionBlock :extensions="['vitest', 'jest']">

`useProvider()` and `useSystemPrompt()` are helpers for vitest and jest tests that let the CLI (`pest compare`, `pest optimize`, `pest compress`) swap providers and prompts via environment variables. They are not applicable to Playwright tests.

::: code-group

```ts [vitest]
// tests/assistant.test.ts
import { describe, test, expect } from "vitest";
import { send, useProvider, useSystemPrompt } from "@heilgar/pest-core";

const provider = await useProvider(); // reads PEST_PROVIDER from env, falls back to first in config
const systemPrompt = useSystemPrompt("You are a helpful assistant."); // PEST_SYSTEM_PROMPT override

describe("my assistant", () => {
  test("responds helpfully", async () => {
    const res = await send(provider, "Hello!", { systemPrompt });
    expect(res).toContainText("hello");
  });
});
```

```ts [jest]
// tests/assistant.test.ts
import { describe, test, expect } from "@jest/globals";
import { send, useProvider, useSystemPrompt } from "@heilgar/pest-core";

const provider = await useProvider();
const systemPrompt = useSystemPrompt("You are a helpful assistant.");

describe("my assistant", () => {
  test("responds helpfully", async () => {
    const res = await send(provider, "Hello!", { systemPrompt });
    expect(res).toContainText("hello");
  });
});
```

:::

When running vitest or jest directly, these helpers use defaults from config. When the CLI runs your tests, it sets the env vars to control which provider/prompt to use.

</ExtensionBlock>

## Next steps

- [Configuration](/guide/configuration) — full config reference
- [Examples](/guide/examples) — real-world testing patterns
- [Matchers](/architecture/matchers) — complete matcher reference
- [CLI](/reference/cli) — compare, qa, optimize, compress commands
