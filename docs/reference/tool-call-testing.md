# Tool Call Testing

Verify that your system prompts cause the LLM to call the right tools, with the right arguments, in the right order. This is critical for agent-based applications where wrong tool calls mean wrong actions.

## How it works

1. Define tools in your `describe` block (or import from your project)
2. `send()` passes the tools to the LLM alongside the system prompt
3. The LLM responds with tool calls
4. Use `expect()` matchers to verify correctness

pest does NOT execute the tools. It only verifies that the LLM *attempted* to call the right tools with the right arguments.

## Defining tools

### Inline

```typescript
describe('Email Agent', {
  systemPrompt: EMAIL_PROMPT,
  tools: [
    {
      name: 'send_email',
      description: 'Send an email to a recipient',
      parameters: {
        to: { type: 'string', required: true, description: 'Email address' },
        subject: { type: 'string', required: true },
        body: { type: 'string', required: true },
        priority: { type: 'string', enum: ['low', 'normal', 'high'] },
      },
    },
    {
      name: 'create_calendar_event',
      description: 'Create a calendar event',
      parameters: {
        title: { type: 'string', required: true },
        date: { type: 'string', required: true, description: 'ISO 8601 date' },
        attendees: { type: 'array', items: { type: 'string' } },
      },
    },
  ],
}, () => { /* tests */ });
```

### Imported from your project

```typescript
import { emailTools } from '../src/tools/email';

describe('Email Agent', {
  systemPrompt: EMAIL_PROMPT,
  tools: emailTools,
}, () => { /* tests */ });
```

## Verifying tool calls

### Was the right tool called?

```typescript
test('sends email when asked', async ({ send }) => {
  const res = await send('Send an email to bob@acme.com about the meeting');
  expect(res).toCallTool('send_email');
});

test('does not send email for questions', async ({ send }) => {
  const res = await send('What emails did I get today?');
  expect(res).not.toCallTool('send_email');
});

test('no tools for general questions', async ({ send }) => {
  const res = await send('What time is it?');
  expect(res).not.toCallAnyTool();
});
```

### Were the arguments correct?

```typescript
test('correct email arguments', async ({ send }) => {
  const res = await send('Send a high priority email to bob@acme.com with subject "Urgent Meeting"');

  expect(res).toCallToolWith('send_email', {
    to: 'bob@acme.com',
    subject: 'Urgent Meeting',
    priority: 'high',
  });
});
```

Partial match — only check fields you care about:

```typescript
test('correct recipient', async ({ send }) => {
  const res = await send('Email bob@acme.com about anything');

  expect(res).toCallToolWithMatch('send_email', {
    to: 'bob@acme.com',
    // Don't care about subject, body, or priority
  });
});
```

Regex patterns for values:

```typescript
test('date format is ISO 8601', async ({ send }) => {
  const res = await send('Schedule a meeting for next Monday');

  expect(res).toCallToolWithMatch('create_calendar_event', {
    date: /^\d{4}-\d{2}-\d{2}/,
  });
});
```

### How many tool calls?

```typescript
test('single tool call', async ({ send }) => {
  const res = await send('Check order #12345');
  expect(res).toHaveToolCallCount(1);
});

test('two emails sent', async ({ send }) => {
  const res = await send('Email both alice and bob about the meeting');
  expect(res).toHaveToolCallCount(2, 'send_email');
});
```

### Correct order?

```typescript
test('search before booking', async ({ send }) => {
  const res = await send('Book a flight to Paris for Monday');

  expect(res).toCallToolsInOrder(['search_flights', 'book_flight']);
});
```

Strict ordering (no other calls in between):

```typescript
expect(res).toCallToolsInOrder(['search_flights', 'book_flight'], { strict: true });
```

### Specific call by index

```typescript
test('two different emails', async ({ send }) => {
  const res = await send('Email alice@acme.com and bob@acme.com about the meeting');

  expect(res).toHaveToolCallCount(2, 'send_email');
  expect(res).toCallToolAtIndex(0, 'send_email', { to: 'alice@acme.com' });
  expect(res).toCallToolAtIndex(1, 'send_email', { to: 'bob@acme.com' });
});
```

### Argument schema validation

```typescript
test('valid email structure', async ({ send }) => {
  const res = await send('Send an email to the team');

  expect(res).toCallToolWithSchema('send_email', {
    type: 'object',
    required: ['to', 'subject', 'body'],
    properties: {
      to: { type: 'string' },
      subject: { type: 'string', minLength: 1 },
      priority: { type: 'string', enum: ['low', 'normal', 'high'] },
    },
  });
});
```

## Combining with judge matchers

Verify both tool correctness and response quality:

```typescript
test('refund flow is correct and polite', async ({ send }) => {
  const res = await send('Refund order #12345, it arrived damaged');

  // Tool checks
  expect(res).toCallTool('process_refund');
  expect(res).toCallToolWith('process_refund', { order_id: '12345' });
  expect(res).not.toCallTool('escalate');

  // Response text checks
  expect(res).toContain('refund');
  expect(res).not.toContain('unable');

  // LLM judge check
  await expect(res).toPassJudge(
    'Response confirms refund is being processed and is empathetic about the damage',
  );
});
```

## Accessing raw tool call data

For custom assertions, access `res.toolCalls` directly:

```typescript
test('custom tool call check', async ({ send }) => {
  const res = await send('Process the order');

  // res.toolCalls is ToolCall[]
  const refundCall = res.toolCalls.find(tc => tc.name === 'process_refund');
  expect(refundCall).toBeDefined();
  expect(Number(refundCall!.arguments.amount)).toBeLessThan(500);
});
```

## Full example: customer support agent

```typescript
import { describe, test, expect } from 'pest';
import { SUPPORT_PROMPT } from '../src/prompts/support';
import { supportTools } from '../src/tools/support';

describe('Customer Support Agent', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
}, () => {

  test('looks up order when asked about status', async ({ send }) => {
    const res = await send('Where is my order #12345?');
    expect(res).toCallTool('lookup_order');
    expect(res).toCallToolWith('lookup_order', { order_id: '12345' });
    expect(res).toHaveToolCallCount(1);
  });

  test('processes refund for damaged items', async ({ send }) => {
    const res = await send('I want a refund for order #67890, the item was broken');
    expect(res).toCallTool('process_refund');
    expect(res).toCallToolWithMatch('process_refund', { order_id: '67890' });
    expect(res).not.toCallTool('escalate');
  });

  test('escalates angry customers with high priority', async ({ send }) => {
    const res = await send('THIS IS RIDICULOUS! NOTHING WORKS! GET ME A MANAGER!');
    expect(res).toCallTool('escalate');
    expect(res).toCallToolWith('escalate', { priority: 'high' });
  });

  test('does not use tools for general questions', async ({ send }) => {
    const res = await send('What are your return policies?');
    expect(res).not.toCallAnyTool();
    await expect(res).toPassJudge('Provides helpful information about return policies');
  });

  test('checks order before refunding', async ({ send }) => {
    const res = await send('Check order #111 and then refund it, wrong item');
    expect(res).toCallToolsInOrder(['lookup_order', 'process_refund']);
  });

  // Parameterized: test multiple order IDs
  for (const orderId of ['AAA-111', 'BBB-222', '12345', 'ORD-99999']) {
    test(`extracts order ID "${orderId}" correctly`, async ({ send }) => {
      const res = await send(`Check status of order ${orderId}`);
      expect(res).toCallToolWith('lookup_order', { order_id: orderId });
    });
  }
});
```
