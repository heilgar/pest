---
layout: home

hero:
  name: pest
  text: Prompt Evaluation & Scoring Toolkit
  tagline: Lightweight TypeScript library for testing LLM prompts with a vitest-like API
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/heilgar/pest

features:
  - title: Test your prompts
    details: Write test cases in TypeScript, import your actual system prompts and tool definitions, verify LLM behavior with familiar expect() matchers.
  - title: Verify tool calls
    details: "expect(res).toCallTool('process_refund') — ensure your prompts trigger the exact tools you expect, with the right arguments, in the right order."
  - title: Compare models
    details: Run the same tests against GPT-4o, Claude, Gemini, Grok, Llama, and others. Get a ranked comparison across accuracy, tool correctness, latency, and cost.
  - title: Judge with LLMs
    details: Use a powerful model as an automated judge to score responses on any criteria you define in plain language.
  - title: Generate test cases
    details: Let an LLM act as QA — automatically generating edge cases and adversarial inputs to find where your prompts fail.
  - title: Optimize prompts
    details: Automatically improve and compress your prompts. Iteratively refine variants, score them, find the shortest prompt that maintains accuracy.
---

## Quick start

```bash
npm install pest
```

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

## Native to your codebase

Other tools define tests in YAML/JSON config files. pest uses TypeScript.

- **Import your project's code.** Use the same prompt strings, tool definitions, and constants from your actual application.
- **Full language power.** Loops, conditionals, helper functions, parameterized tests — no config language limitations.
- **Type safety.** TypeScript catches errors before you run tests.
- **IDE support.** Autocomplete, go-to-definition, refactoring — all work naturally.
- **Familiar.** If you know vitest or jest, you know pest.
