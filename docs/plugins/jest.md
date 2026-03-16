::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# jest Plugin

`@pest/jest` integrates pest with jest. pest tests run as regular jest tests, alongside your existing test suite.

## Installation

::: code-group
```bash [npm]
npm install -D @pest/jest
```
```bash [pnpm]
pnpm add -D @pest/jest
```
```bash [yarn]
yarn add -D @pest/jest
```
```bash [bun]
bun add -D @pest/jest
```
:::

## Setup

### 1. Add the preset to jest.config.ts

```typescript
// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: '@pest/jest',
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',  // your existing tests
    '**/*.pest.ts',                  // pest tests
  ],
}

export default config
```

Or extend an existing config:

```typescript
// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  // ... your existing config
  setupFilesAfterFramework: [
    ...(existingSetup ?? []),
    '@pest/jest/setup',
  ],
  testMatch: [
    ...(existingMatch ?? ['**/*.test.ts']),
    '**/*.pest.ts',
  ],
}

export default config
```

### 2. Create pest.config.ts

```typescript
// pest.config.ts
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
  judge: {
    provider: 'gpt-4o',
  },
})
```

### 3. Write a test

```typescript
// tests/assistant.pest.ts
import { describe, test } from '@pest/jest'

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
npx jest
```

Or run only pest test files:

```bash
npx jest --testPathPattern='\.pest\.ts$'
```

## Directory structure

```
my-project/
├── src/
│   ├── prompts/
│   └── tools/
├── tests/
│   ├── support.test.ts      ← regular jest tests
│   ├── support.pest.ts      ← pest tests
│   └── assistant.pest.ts
├── pest.config.ts           ← provider config
├── jest.config.ts           ← jest config (includes @pest/jest preset)
└── package.json
```

## TypeScript setup

If you use TypeScript with jest (via `ts-jest` or `babel-jest`), ensure your `tsconfig.json` includes pest test files:

```json
{
  "include": ["src/**/*", "tests/**/*.pest.ts"]
}
```

## Using expect matchers

`@pest/jest` extends jest's `expect` via `expect.extend()`. No extra imports needed:

```typescript
import { describe, test } from '@pest/jest'

describe('Suite', { systemPrompt: '...' }, () => {
  test('example', async ({ send }) => {
    const res = await send('Hello')

    // All pest matchers available on jest's expect
    expect(res).toContain('hello')
    expect(res).toCallTool('greet')
    await expect(res).toPassJudge('Response is friendly')
  })
})
```

## Timeout configuration

LLM calls can be slow. Increase jest's default timeout for pest test files:

```typescript
// pest.config.ts
export default defineConfig({
  providers: [...],
  limits: {
    timeout: 30_000,   // 30s per LLM request
  },
})
```

Or globally in jest config:

```typescript
// jest.config.ts
export default {
  testTimeout: 60_000,  // 60s for all tests
}
```

## Configuration reference

See [Configuration](/reference/configuration) for the full `pest.config.ts` reference.
