# Writing Tests

pest tests use a familiar `describe` / `test` / `expect` API inspired by vitest and jest. Tests are TypeScript files that import your project's code directly.

## Basic structure

```typescript
// tests/my-bot.pest.ts
import { describe, test, expect } from 'pest';

describe('My Bot', {
  systemPrompt: 'You are a helpful assistant.',
}, () => {

  test('answers questions', async ({ send }) => {
    const res = await send('What is 2+2?');
    expect(res).toContain('4');
  });

});
```

## `describe(name, options, fn)`

Groups related tests. Sets the system prompt, tools, and other options shared across tests.

```typescript
describe('Suite name', {
  systemPrompt: string,              // Required: the prompt being tested
  tools?: ToolDefinition[],           // Optional: tool definitions
  providers?: string[],               // Optional: limit to specific providers
  judge?: { provider?: string },      // Optional: override judge
  temperature?: number,               // Optional: override temperature
}, () => {
  // tests go here
});
```

### Importing prompts from your project

```typescript
import { SUPPORT_PROMPT } from '../src/prompts/support';
import { supportTools } from '../src/tools';

describe('Support Agent', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
}, () => {
  // ...
});
```

### Nested describes

```typescript
describe('Support Agent', { systemPrompt: PROMPT, tools }, () => {

  describe('refund handling', () => {
    test('processes valid refunds', async ({ send }) => { /* ... */ });
    test('rejects invalid refunds', async ({ send }) => { /* ... */ });
  });

  describe('escalation', () => {
    test('escalates angry customers', async ({ send }) => { /* ... */ });
    test('does not escalate simple questions', async ({ send }) => { /* ... */ });
  });

});
```

Nested `describe` blocks inherit the parent's `systemPrompt` and `tools`.

## `test(name, fn)`

Defines a single test case. The callback receives a context object with `send`.

```typescript
test('test name', async ({ send }) => {
  const res = await send('user message');
  expect(res).toContain('expected');
});
```

### `send(message)`

Sends a user message to the LLM with the suite's system prompt and tools. Returns a `PestResponse` object.

```typescript
const res = await send('Hello, can you help me?');

// Access response data
res.text;        // Response text content
res.toolCalls;   // Array of tool calls made
res.usage;       // Token usage { promptTokens, completionTokens, totalTokens }
res.latencyMs;   // Response time in ms
```

## Multi-turn conversations

Test multi-turn dialogues by passing message history:

```typescript
test('handles follow-up questions', async ({ send, conversation }) => {
  await conversation([
    { role: 'user', content: 'Book a flight to Paris' },
    { role: 'assistant', content: "I'd be happy to help! What dates?" },
  ]);

  const res = await send('Next Monday to Friday');

  expect(res).toCallTool('search_flights');
  expect(res).toCallToolWith('search_flights', { destination: 'Paris' });
});
```

## Parameterized tests

Use loops and arrays to generate tests dynamically:

```typescript
import { ORDER_IDS } from '../src/fixtures';

describe('Order Lookup', { systemPrompt: PROMPT, tools }, () => {

  for (const orderId of ORDER_IDS) {
    test(`looks up order ${orderId}`, async ({ send }) => {
      const res = await send(`Where is my order #${orderId}?`);
      expect(res).toCallTool('check_order_status');
      expect(res).toCallToolWith('check_order_status', { order_id: orderId });
    });
  }

});
```

### Using `test.each`

```typescript
test.each([
  { input: 'Refund order #123', tool: 'process_refund', args: { order_id: '123' } },
  { input: 'Check order #456', tool: 'check_order_status', args: { order_id: '456' } },
  { input: 'Talk to a human', tool: 'escalate', args: { priority: 'medium' } },
])('$input triggers $tool', async ({ send }, { input, tool, args }) => {
  const res = await send(input);
  expect(res).toCallTool(tool);
  expect(res).toCallToolWith(tool, args);
});
```

## Lifecycle hooks

```typescript
describe('My Suite', { systemPrompt: PROMPT }, () => {

  beforeAll(async () => {
    // Run once before all tests in this suite
  });

  afterAll(async () => {
    // Run once after all tests
  });

  beforeEach(async () => {
    // Run before each test
  });

  afterEach(async ({ result }) => {
    // Run after each test, with access to the result
    if (!result.passed) {
      console.log('Failed:', result.response.text);
    }
  });

  test('...', async ({ send }) => { /* ... */ });
});
```

## Skipping and focusing tests

```typescript
test.skip('not ready yet', async ({ send }) => {
  // Skipped
});

test.only('debug this one', async ({ send }) => {
  // Only this test runs
});

describe.skip('disabled suite', { systemPrompt: PROMPT }, () => {
  // All tests skipped
});
```

## Timeouts

```typescript
test('slow model response', async ({ send }) => {
  // ...
}, { timeout: 60_000 }); // 60 second timeout for this test
```

## Helper functions

Since tests are TypeScript, create helpers naturally:

```typescript
async function expectRefund(send: SendFn, orderId: string, reason: string) {
  const res = await send(`Refund order #${orderId} because ${reason}`);
  expect(res).toCallTool('process_refund');
  expect(res).toCallToolWith('process_refund', { order_id: orderId });
  expect(res).not.toCallTool('escalate');
  return res;
}

describe('Refunds', { systemPrompt: PROMPT, tools }, () => {
  test('damaged item', async ({ send }) => {
    await expectRefund(send, '12345', 'it arrived damaged');
  });

  test('wrong item', async ({ send }) => {
    await expectRefund(send, '67890', 'I received the wrong product');
  });
});
```

## Running tests

```bash
# Run all test files
npx pest

# Run specific file
npx pest tests/support.pest.ts

# Run specific directory
npx pest tests/support/

# Run tests matching a name pattern
npx pest --filter "refund"

# Run against specific providers only
npx pest --providers gpt-4o,claude-sonnet
```
