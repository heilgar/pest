# Getting Started

## Installation

::: code-group
```bash [npm]
npm install pest
```
```bash [pnpm]
pnpm add pest
```
```bash [yarn]
yarn add pest
```
```bash [bun]
bun add pest
```
:::

## Project setup

### 1. Create a config file

```typescript
// pest.config.ts
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
  judge: {
    provider: 'gpt-4o',
  },
});
```

### 2. Write your first test

```typescript
// tests/assistant.pest.ts
import { describe, test, expect } from 'pest';

describe('My Assistant', {
  systemPrompt: `
    You are a helpful assistant. Answer questions clearly and concisely.
    If you don't know something, say so honestly.
  `,
}, () => {

  test('answers factual questions', async ({ send }) => {
    const res = await send('What is the capital of France?');

    expect(res).toContain('Paris');
    await expect(res).toPassJudge('Answer is factually correct and concise');
  });

  test('admits uncertainty', async ({ send }) => {
    const res = await send('What will the stock price of AAPL be tomorrow?');

    await expect(res).toPassJudge('Honestly states it cannot predict future stock prices');
  });

});
```

### 3. Run tests

```bash
npx pest
```

Output:

```
pest v0.1.0

  My Assistant (gpt-4o)
    [PASS] answers factual questions (score: 0.95)
    [PASS] admits uncertainty (score: 0.90)

  2/2 passed | avg score: 0.925 | 3.1s
```

## Importing your project's code

The main advantage of pest over YAML-based tools — use your actual project code:

```typescript
// tests/support.pest.ts
import { describe, test, expect } from 'pest';
import { SUPPORT_SYSTEM_PROMPT } from '../src/prompts/support';
import { supportTools } from '../src/tools/support';
import { ORDER_STATUSES } from '../src/constants';

describe('Support Agent', {
  systemPrompt: SUPPORT_SYSTEM_PROMPT,
  tools: supportTools,
}, () => {

  test('looks up order status', async ({ send }) => {
    const res = await send('Where is my order #12345?');
    expect(res).toCallTool('check_order_status');
    expect(res).toCallToolWith('check_order_status', { order_id: '12345' });
  });

  // Parameterized tests using your project's constants
  for (const status of ORDER_STATUSES) {
    test(`handles ${status} status correctly`, async ({ send }) => {
      const res = await send(`My order status shows ${status}, what does that mean?`);
      await expect(res).toPassJudge(`Correctly explains what "${status}" means`);
    });
  }

});
```

## Directory structure

```
my-project/
├── src/
│   ├── prompts/
│   │   └── support.ts          # Your system prompts
│   ├── tools/
│   │   └── support.ts          # Your tool definitions
│   └── constants.ts
├── tests/
│   ├── support.pest.ts         # pest tests
│   ├── assistant.pest.ts
│   └── safety.pest.ts
├── pest.config.ts              # Provider config
├── package.json
└── tsconfig.json
```

## Next steps

- [Configuration](/guide/configuration) — Full config reference
- [Writing Tests](/guide/writing-tests) — `describe`, `test`, `send`, multi-turn
- [Expect Matchers](/reference/matchers) — All available matchers
- [Tool Call Testing](/reference/tool-call-testing) — Verify tool call behavior
