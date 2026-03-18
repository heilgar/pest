# @heilgar/pest-jest

Jest integration for **pest** (Prompt Evaluation & Scoring Toolkit) — add LLM prompt testing to your Jest test suite with custom `expect()` matchers.

## Features

- **Custom Jest matchers** — `expect(response).toContainToolCall(...)`, `expect(response).toSatisfyCriteria(...)`, and more via `expect.extend()`
- **LLM-as-judge** — use a powerful model to score responses against plain-language criteria
- **Deterministic + semantic assertions** — verify tool calls, response schemas, text content, and semantic meaning
- **Custom reporter** — optional reporter for prompt test results
- **TypeScript support** — full type definitions for all matchers

## Install

```bash
npm install @heilgar/pest-jest @heilgar/pest-core
```

## Quick Start

```typescript
// jest.config.ts
export default {
  setupFilesAfterFramework: ['@heilgar/pest-jest/setup'],
};
```

```typescript
// tests/prompt.test.ts
import { send, createProvider } from '@heilgar/pest-core';
import { setJudge } from '@heilgar/pest-jest';

const provider = createProvider({ type: 'openai', model: 'gpt-4o', apiKey: '...' });
setJudge(provider);

test('responds helpfully', async () => {
  const res = await send(provider, 'Help me');
  await expect(res).toSatisfyCriteria('Response is helpful and friendly');
});
```

## Documentation

Full docs at [heilgar.github.io/pest](https://heilgar.github.io/pest/)

## License

MIT
