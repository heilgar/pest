::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# vitest Plugin

`@pest/vitest` integrates pest with vitest. pest tests run as regular vitest tests — you get watch mode, coverage, filtering, and the vitest UI out of the box.

## Installation

::: code-group
```bash [npm]
npm install -D @pest/vitest
```
```bash [pnpm]
pnpm add -D @pest/vitest
```
```bash [yarn]
yarn add -D @pest/vitest
```
```bash [bun]
bun add -D @pest/vitest
```
:::

## Setup

### 1. Add the plugin to vitest.config.ts

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { pestPlugin } from '@pest/vitest'

export default defineConfig({
  plugins: [pestPlugin()],
  test: {
    include: ['**/*.pest.ts'],
  },
})
```

### 2. Create pest.config.ts

```typescript
// pest.config.ts
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
  judge: {
    provider: 'gpt-4o',
  },
})
```

### 3. Write a test

```typescript
// tests/assistant.pest.ts
import { describe, test } from '@pest/vitest'

describe('My Assistant', {
  systemPrompt: 'You are a helpful assistant.',
}, () => {

  test('answers factual questions', async ({ send }) => {
    const res = await send('What is the capital of France?')

    expect(res).toContain('Paris')
    await expect(res).toPassJudge('Answer is factually correct and concise')
  })

})
```

### 4. Run tests

```bash
npx vitest
```

Or to run only pest test files:

```bash
npx vitest --include '**/*.pest.ts'
```

## Directory structure

```
my-project/
├── src/
│   ├── prompts/
│   └── tools/
├── tests/
│   ├── support.pest.ts      ← pest tests
│   └── assistant.pest.ts
├── pest.config.ts           ← provider config
├── vitest.config.ts         ← vitest config (includes pestPlugin)
└── package.json
```

## Watch mode

Because pest tests run inside vitest, watch mode works natively:

```bash
npx vitest --watch
```

pest tests re-run when their source files change. Note that LLM calls always hit the network (or cache if enabled) — use `cache: { enabled: true }` in your config to avoid redundant API calls during development.

## Coverage

Coverage works with the standard vitest coverage setup. Add `@vitest/coverage-v8` or `@vitest/coverage-istanbul`:

```bash
npx vitest --coverage
```

## vitest UI

The vitest UI shows pest test results alongside regular unit tests:

```bash
npx vitest --ui
```

## Using expect matchers

The plugin automatically extends vitest's `expect` with pest matchers. No extra import needed — just use `expect(res)` as you would normally:

```typescript
import { describe, test } from '@pest/vitest'

describe('Suite', { systemPrompt: '...' }, () => {
  test('example', async ({ send }) => {
    const res = await send('Hello')

    // All pest matchers available on vitest's expect
    expect(res).toContain('hello')
    expect(res).toCallTool('greet')
    await expect(res).toPassJudge('Response is friendly')
  })
})
```

## Configuration reference

See [Configuration](/reference/configuration) for the full `pest.config.ts` reference.
