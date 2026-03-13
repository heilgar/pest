# pest - Prompt Evaluation & Scoring Toolkit

Lightweight JS/TS library for testing LLM prompts with a vitest-like API. Combines prompt evaluation, model comparison, LLM-as-judge, LLM-as-QA, tool call verification, and prompt tuning/compression.

## Goals

1. Test system prompt result accuracy
2. Compare foundational LLM accuracy scores and response quality
3. LLM-as-Judge evaluation
4. LLM-as-QA (auto-generate test cases)
5. Tool call verification (ensure prompts trigger exact expected tools)
6. Prompt tuning & compression (suggest better prompts, reduce tokens, loop to find best)

## Design Principles

- **Tests are code, not config.** Write tests in TS/JS — import your project's prompts, tools, constants, types directly.
- **Familiar API.** `describe` / `test` / `expect` — same patterns as vitest/jest.
- **Config is minimal.** `pest.config.ts` only holds provider credentials and global settings. Test logic lives in test files.
- **Lightweight.** Direct SDK calls, no LangChain. Valibot for validation.

## API Design

```typescript
// tests/support.pest.ts
import { describe, test, expect, judge } from 'pest';
import { SUPPORT_PROMPT } from '../src/prompts/support';
import { tools } from '../src/tools/support';

describe('Customer Support Agent', {
  systemPrompt: SUPPORT_PROMPT,
  tools,
  providers: ['gpt-4o', 'claude-sonnet'],
}, () => {

  test('handles refund requests', async ({ send }) => {
    const res = await send('I want a refund for order #12345, it arrived damaged');

    expect(res).toCallTool('process_refund');
    expect(res).toCallToolWith('process_refund', { order_id: '12345' });
    expect(res).not.toCallTool('escalate');
    expect(res).toContain('refund');
    await expect(res).toPassJudge('Response is polite and confirms refund processing');
  });

  test('checks order status', async ({ send }) => {
    const res = await send('Where is my order #67890?');

    expect(res).toCallTool('check_order_status');
    expect(res).toCallToolWith('check_order_status', { order_id: '67890' });
    expect(res).toHaveToolCallCount(1);
  });

  test('escalates angry customers', async ({ send }) => {
    const res = await send('This is the third time calling! Nothing works! Get me a manager!');

    expect(res).toCallTool('escalate');
    expect(res).toCallToolWith('escalate', { priority: 'high' });
    expect(res).not.toCallTool('process_refund');
  });

  test('answers without tools when appropriate', async ({ send }) => {
    const res = await send('What are your business hours?');

    expect(res).not.toCallAnyTool();
    await expect(res).toPassJudge('Provides business hours or offers to check');
  });

  test('calls tools in correct order', async ({ send }) => {
    const res = await send('Check order #111 and if delivered, refund order #222');

    expect(res).toCallToolsInOrder(['check_order_status', 'process_refund']);
  });
});
```

## Architecture

```
pest/
├── src/
│   ├── index.ts                  # Public API: describe, test, expect, judge
│   ├── config/
│   │   ├── loader.ts             # Load pest.config.ts|yaml|json
│   │   └── schema.ts             # Config validation (valibot)
│   ├── providers/
│   │   ├── types.ts              # Provider interface
│   │   ├── openai.ts             # OpenAI provider
│   │   ├── anthropic.ts          # Anthropic provider
│   │   ├── gemini.ts             # Google Gemini provider
│   │   ├── xai.ts                # xAI Grok provider (OpenAI-compatible)
│   │   ├── ollama.ts             # Ollama (local models)
│   │   └── registry.ts           # Provider registry
│   ├── runner/
│   │   ├── executor.ts           # Runs prompts against providers
│   │   ├── context.ts            # Test context ({ send })
│   │   ├── parallel.ts           # Concurrent execution w/ rate limiting
│   │   └── cache.ts              # Response caching
│   ├── matchers/
│   │   ├── expect.ts             # expect() entry + chaining
│   │   ├── text.ts               # toContain, toMatch, toMatchSchema, etc.
│   │   ├── tools.ts              # toCallTool, toCallToolWith, toCallToolsInOrder, etc.
│   │   └── judge.ts              # toPassJudge, toBeSemanticallySimilar
│   ├── evaluator/
│   │   ├── judge.ts              # LLM-as-Judge scoring
│   │   └── qa.ts                 # LLM-as-QA (generates test cases)
│   ├── tuner/
│   │   ├── optimizer.ts          # Iterative prompt improvement
│   │   ├── compressor.ts         # Prompt compression
│   │   └── scorer.ts             # Compare tuned variants
│   └── reporter/
│       ├── console.ts            # Terminal output
│       ├── json.ts               # JSON report
│       └── html.ts               # Static HTML report
├── pest.config.ts                # Example config
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Config Format (`pest.config.ts`)

Config only holds providers and global settings. No test cases.

```typescript
import { defineConfig } from 'pest';

export default defineConfig({
  providers: [
    {
      name: 'gpt-4o',
      type: 'openai',
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
    },
    {
      name: 'claude-sonnet',
      type: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    {
      name: 'gemini-2',
      type: 'gemini',
      model: 'gemini-2.5-flash',
      apiKey: process.env.GOOGLE_AI_API_KEY,
    },
    {
      name: 'grok-4',
      type: 'xai',
      model: 'grok-4',
      apiKey: process.env.XAI_API_KEY,
    },
    {
      name: 'llama-local',
      type: 'ollama',
      model: 'llama3.2',
    },
  ],
  judge: {
    provider: 'gpt-4o',
    temperature: 0,
  },
  limits: {
    concurrency: 3,
    requestsPerMinute: 30,
    timeout: 30000,
  },
  cache: {
    enabled: true,
    ttl: 86400,
  },
});
```

## Expect Matchers

### Text matchers
- `expect(res).toContain(substring)`
- `expect(res).toMatch(regex)`
- `expect(res).toMatchSchema(jsonSchema)`
- `expect(res).toHaveLength({ min?, max? })`

### Tool call matchers
- `expect(res).toCallTool(name)`
- `expect(res).not.toCallTool(name)`
- `expect(res).not.toCallAnyTool()`
- `expect(res).toCallToolWith(name, args)`
- `expect(res).toCallToolWithMatch(name, partialArgs)`
- `expect(res).toCallToolWithSchema(name, schema)`
- `expect(res).toHaveToolCallCount(n)`
- `expect(res).toCallToolsInOrder([name1, name2])`

### Judge matchers (async)
- `await expect(res).toPassJudge(criteria, { threshold? })`
- `await expect(res).toBeSemanticallySimilar(expected, { threshold? })`

### Response metadata
- `expect(res).toRespondWithin(ms)`
- `expect(res).toCostLessThan(dollars)`

## Flows

### Flow 1: Prompt Accuracy Testing
```
Import project's system prompt + tools
  -> Write test cases with expect matchers
  -> pest runs against configured providers
  -> Output: pass/fail per test, scores per criteria
```

### Flow 2: Model Comparison
```
describe block with providers: ['gpt-4o', 'claude-sonnet', 'llama-local']
  -> Same tests run against each provider
  -> Output: ranked comparison table
```

### Flow 3: Tool Call Verification
```
Import project's tool definitions
  -> Write tests with toCallTool, toCallToolWith, etc.
  -> pest sends prompt + tools to LLM
  -> Extracts tool_calls from response
  -> Matchers verify correctness
```

### Flow 4: LLM-as-QA
```
pest.qa(systemPrompt, tools, behaviorDescription)
  -> QA LLM generates edge-case inputs
  -> Runner executes all against target
  -> Judge evaluates responses
  -> Output: generated test file + weak spots report
```

### Flow 5: Prompt Tuning
```
pest.tune(systemPrompt, testFile, options)
  -> Tuner suggests N improved variants
  -> Runner tests all variants against existing tests
  -> Judge scores them
  -> Loop: best variant -> refine -> test again
  -> Output: best prompt + compression ratio + scores
```

## Implementation Phases

| Phase | Scope |
|-------|-------|
| **Phase 1** | Config loader, provider interface + OpenAI/Anthropic, describe/test/send, console reporter |
| **Phase 2** | Text matchers (toContain, toMatch, etc.) |
| **Phase 3** | Tool call matchers (toCallTool, toCallToolWith, toCallToolsInOrder, etc.) |
| **Phase 4** | LLM-as-Judge matchers (toPassJudge, toBeSemanticallySimilar) |
| **Phase 5** | LLM-as-QA (test case generation) |
| **Phase 6** | Model comparison mode with ranked output |
| **Phase 7** | Prompt tuner + compressor |
| **Phase 8** | Caching, HTML reporter, CLI tool |

## Tech Stack

- Runtime: Node.js (ESM)
- Language: TypeScript
- Build: tsup
- Testing: vitest (for pest's own tests)
- Validation: valibot
- CLI: citty
- Zero heavy deps - direct SDK calls (openai, @anthropic-ai/sdk, @google/genai, fetch for xAI/Ollama)

## Test File Conventions

- Test files: `**/*.pest.ts` or `**/*.pest.js`
- Config file: `pest.config.ts` (or .yaml, .json)
- Run all: `npx pest`
- Run specific: `npx pest tests/support.pest.ts`

## Competitive Positioning

No existing JS/TS tool combines:
- Code-first test definitions (import your project's code)
- vitest-like API (describe/test/expect)
- Tool call verification matchers
- LLM-as-judge matchers
- Model comparison
- LLM-as-QA generation
- Prompt tuning/compression

in a lightweight library. Promptfoo uses YAML configs (can't import project code). DeepEval is Python-only. Braintrust is closed SaaS.
