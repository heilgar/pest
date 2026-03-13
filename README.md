# pest

**Prompt Evaluation & Scoring Toolkit** — lightweight TypeScript library for testing LLM prompts with a vitest-like API.

```bash
npm install pest
```

## What it does

- **Test your prompts** — write test cases in TypeScript, import your actual system prompts and tool definitions, verify LLM behavior with familiar `expect()` matchers
- **Verify tool calls** — `expect(res).toCallTool('process_refund')` — ensure your prompts trigger the exact tools you expect, with the right arguments, in the right order
- **Compare models** — run the same tests against GPT-4o, Claude, Gemini, Grok, Llama, and others. Get a ranked comparison across accuracy, tool correctness, latency, and cost
- **Judge with LLMs** — use a powerful model as an automated judge to score responses on any criteria you define in plain language
- **Generate test cases** — let an LLM act as QA, automatically generating edge cases and adversarial inputs to find where your prompts fail
- **Optimize prompts** — automatically improve and compress your prompts, iteratively refine variants, find the shortest prompt that maintains accuracy

## Quick start

Create a config:

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
  judge: { provider: 'gpt-4o' },
});
```

Write a test:

```typescript
// tests/greeting.pest.ts
import { describe, test, expect } from 'pest';

describe('Greeting Bot', {
  systemPrompt: 'You are a friendly greeting bot. Say hello and ask how you can help.',
}, () => {

  test('responds to greetings', async ({ send }) => {
    const res = await send('Hi there');

    expect(res).toContain('hello');
    await expect(res).toPassJudge('Response is friendly and asks how to help');
  });

});
```

Run it:

```bash
npx pest
```

```
pest v0.1.0

  Greeting Bot (gpt-4o)
    [PASS] responds to greetings (score: 0.95)

  1/1 passed | avg score: 0.950 | 1.2s
```

## Native to your codebase

Other tools define tests in YAML/JSON config files. pest uses TypeScript.

```typescript
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

  for (const status of ORDER_STATUSES) {
    test(`handles ${status} status correctly`, async ({ send }) => {
      const res = await send(`My order status shows ${status}, what does that mean?`);
      await expect(res).toPassJudge(`Correctly explains what "${status}" means`);
    });
  }

});
```

- **Import your project's code.** Use the same prompt strings, tool definitions, and constants from your actual application.
- **Full language power.** Loops, conditionals, helper functions, parameterized tests — no config language limitations.
- **Type safety.** TypeScript catches errors before you run tests.
- **IDE support.** Autocomplete, go-to-definition, refactoring — all work naturally.
- **Familiar.** If you know vitest or jest, you know pest.

## Providers

| Provider | Type | Notes |
|----------|------|-------|
| OpenAI | `openai` | GPT-4o, GPT-4o-mini, o1, etc. |
| Anthropic | `anthropic` | Claude Sonnet, Opus, Haiku |
| Google Gemini | `gemini` | Gemini 2.5 Flash, Pro |
| xAI | `xai` | Grok (OpenAI-compatible) |
| Ollama | `ollama` | Any local model |

## Matchers

### Text
- `expect(res).toContain(substring)`
- `expect(res).toMatch(regex)`
- `expect(res).toMatchSchema(jsonSchema)`
- `expect(res).toHaveLength({ min?, max? })`

### Tool calls
- `expect(res).toCallTool(name)`
- `expect(res).not.toCallTool(name)`
- `expect(res).not.toCallAnyTool()`
- `expect(res).toCallToolWith(name, args)`
- `expect(res).toCallToolWithMatch(name, partialArgs)`
- `expect(res).toCallToolWithSchema(name, schema)`
- `expect(res).toHaveToolCallCount(n)`
- `expect(res).toCallToolsInOrder([name1, name2])`

### Judge (async)
- `await expect(res).toPassJudge(criteria, { threshold? })`
- `await expect(res).toBeSemanticallySimilar(expected, { threshold? })`

### Metadata
- `expect(res).toRespondWithin(ms)`
- `expect(res).toCostLessThan(dollars)`

## Documentation

Full documentation: [pest.dev](https://pest.dev) (coming soon)

## License

[MIT](LICENSE)
