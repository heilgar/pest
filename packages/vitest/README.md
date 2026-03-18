# @heilgar/pest-vitest

Vitest integration for **pest** (Prompt Evaluation & Scoring Toolkit) — add LLM prompt testing to your Vitest test suite with custom `expect()` matchers.

## Features

- **Custom Vitest matchers** — `expect(response).toContainToolCall(...)`, `expect(response).toSatisfyCriteria(...)`, and more via `expect.extend()`
- **LLM-as-judge** — use a powerful model to score responses against plain-language criteria
- **Deterministic + semantic assertions** — verify tool calls, response schemas, text content, and semantic meaning
- **Vitest plugin & reporter** — optional plugin for automatic setup and a custom reporter for prompt test results
- **TypeScript-native** — full type safety and IDE autocomplete for all matchers

## Install

```bash
npm install @heilgar/pest-vitest @heilgar/pest-core
```

## Quick Start

```typescript
// vitest.config.ts
import { pestPlugin } from '@heilgar/pest-vitest/plugin';

export default defineConfig({
  plugins: [pestPlugin()],
});
```

```typescript
// tests/prompt.test.ts
import { send, createProvider } from '@heilgar/pest-core';
import { setJudge } from '@heilgar/pest-vitest';

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
