::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# Tool Call Testing

Verify that your system prompts cause the LLM to call the right tools, with the right arguments, in the right order. This is critical for agent-based applications where wrong tool calls mean wrong actions.

## How it works

1. Define tools in your `describe` block (or import from your project)
2. `send()` passes the tools to the LLM alongside the system prompt
3. The LLM responds with tool calls
4. Use `expect()` matchers to verify correctness

pest does NOT execute the tools. It only verifies that the LLM *attempted* to call the right tools with the right arguments.

## Defining tools

### Imported from your project

<PluginBlock plugin="vitest">

```typescript
import { describe, test } from '@pest/vitest'
import { emailTools } from '../src/tools/email'

describe('Email Agent', {
  systemPrompt: EMAIL_PROMPT,
  tools: emailTools,
}, () => { /* tests */ })
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { describe, test } from '@pest/jest'
import { emailTools } from '../src/tools/email'

describe('Email Agent', {
  systemPrompt: EMAIL_PROMPT,
  tools: emailTools,
}, () => { /* tests */ })
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from pest_pytest import describe, test
from src.tools.email import email_tools

with describe("Email Agent",
    system_prompt=EMAIL_PROMPT,
    tools=email_tools,
) as suite:
    pass  # tests go here
```

</PluginBlock>

### Inline

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
describe('Email Agent', {
  systemPrompt: EMAIL_PROMPT,
  tools: [
    {
      type: 'function',
      function: {
        name: 'send_email',
        description: 'Send an email to a recipient',
        parameters: {
          type: 'object',
          required: ['to', 'subject', 'body'],
          properties: {
            to: { type: 'string', description: 'Email address' },
            subject: { type: 'string' },
            body: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'normal', 'high'] },
          },
        },
      },
    },
  ],
}, () => { /* tests */ })
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "send_email",
            "description": "Send an email to a recipient",
            "parameters": {
                "type": "object",
                "required": ["to", "subject", "body"],
                "properties": {
                    "to": {"type": "string"},
                    "subject": {"type": "string"},
                    "body": {"type": "string"},
                    "priority": {"type": "string", "enum": ["low", "normal", "high"]},
                },
            },
        },
    }
]

with describe("Email Agent", system_prompt=EMAIL_PROMPT, tools=tools) as suite:
    pass
```

</PluginBlock>

## Verifying tool calls

### Was the right tool called?

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
test('sends email when asked', async ({ send }) => {
  const res = await send('Send an email to bob@acme.com about the meeting')
  expect(res).toCallTool('send_email')
})

test('does not send email for questions', async ({ send }) => {
  const res = await send('What emails did I get today?')
  expect(res).not.toCallTool('send_email')
})

test('no tools for general questions', async ({ send }) => {
  const res = await send('What time is it?')
  expect(res).not.toCallAnyTool()
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
@test("sends email when asked")
async def test_send(send):
    res = await send("Send an email to bob@acme.com about the meeting")
    res.assert_calls_tool("send_email")

@test("does not send email for questions")
async def test_no_send(send):
    res = await send("What emails did I get today?")
    res.assert_not_calls_tool("send_email")

@test("no tools for general questions")
async def test_no_tools(send):
    res = await send("What time is it?")
    res.assert_not_calls_any_tool()
```

</PluginBlock>

### Were the arguments correct?

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
test('correct email arguments', async ({ send }) => {
  const res = await send('Send a high priority email to bob@acme.com with subject "Urgent Meeting"')

  // Exact match — no extra keys allowed
  expect(res).toCallToolWith('send_email', {
    to: 'bob@acme.com',
    subject: 'Urgent Meeting',
    priority: 'high',
  })

  // Partial match — only check fields you care about
  expect(res).toCallToolWithMatch('send_email', {
    to: 'bob@acme.com',
  })
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
@test("correct email arguments")
async def test_args(send):
    res = await send('Send a high priority email to bob@acme.com with subject "Urgent Meeting"')

    # Exact match
    res.assert_calls_tool_with("send_email", {
        "to": "bob@acme.com",
        "subject": "Urgent Meeting",
        "priority": "high",
    })

    # Partial match
    res.assert_calls_tool_with_match("send_email", {"to": "bob@acme.com"})
```

</PluginBlock>

### Correct order?

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
test('search before booking', async ({ send }) => {
  const res = await send('Book a flight to Paris for Monday')
  expect(res).toCallToolsInOrder(['search_flights', 'book_flight'])
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
@test("search before booking")
async def test_order(send):
    res = await send("Book a flight to Paris for Monday")
    res.assert_calls_tools_in_order(["search_flights", "book_flight"])
```

</PluginBlock>

## Full example: customer support agent

<PluginBlock plugin="vitest">

```typescript
import { describe, test } from '@pest/vitest'
import { SUPPORT_PROMPT } from '../src/prompts/support'
import { supportTools } from '../src/tools/support'

describe('Customer Support Agent', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
}, () => {

  test('looks up order when asked about status', async ({ send }) => {
    const res = await send('Where is my order #12345?')
    expect(res).toCallTool('lookup_order')
    expect(res).toCallToolWith('lookup_order', { order_id: '12345' })
    expect(res).toHaveToolCallCount(1)
  })

  test('processes refund for damaged items', async ({ send }) => {
    const res = await send('I want a refund for order #67890, the item was broken')
    expect(res).toCallTool('process_refund')
    expect(res).toCallToolWithMatch('process_refund', { order_id: '67890' })
    expect(res).not.toCallTool('escalate')
  })

  test('escalates angry customers with high priority', async ({ send }) => {
    const res = await send('THIS IS RIDICULOUS! NOTHING WORKS! GET ME A MANAGER!')
    expect(res).toCallTool('escalate')
    expect(res).toCallToolWith('escalate', { priority: 'high' })
  })

  test('checks order before refunding', async ({ send }) => {
    const res = await send('Check order #111 and then refund it, wrong item')
    expect(res).toCallToolsInOrder(['lookup_order', 'process_refund'])
  })

  for (const orderId of ['AAA-111', 'BBB-222', '12345', 'ORD-99999']) {
    test(`extracts order ID "${orderId}" correctly`, async ({ send }) => {
      const res = await send(`Check status of order ${orderId}`)
      expect(res).toCallToolWith('lookup_order', { order_id: orderId })
    })
  }
})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { describe, test } from '@pest/jest'
import { SUPPORT_PROMPT } from '../src/prompts/support'
import { supportTools } from '../src/tools/support'

describe('Customer Support Agent', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
}, () => {

  test('looks up order when asked about status', async ({ send }) => {
    const res = await send('Where is my order #12345?')
    expect(res).toCallTool('lookup_order')
    expect(res).toCallToolWith('lookup_order', { order_id: '12345' })
    expect(res).toHaveToolCallCount(1)
  })

  test('processes refund for damaged items', async ({ send }) => {
    const res = await send('I want a refund for order #67890, the item was broken')
    expect(res).toCallTool('process_refund')
    expect(res).toCallToolWithMatch('process_refund', { order_id: '67890' })
    expect(res).not.toCallTool('escalate')
  })

  test('escalates angry customers with high priority', async ({ send }) => {
    const res = await send('THIS IS RIDICULOUS! NOTHING WORKS! GET ME A MANAGER!')
    expect(res).toCallTool('escalate')
    expect(res).toCallToolWith('escalate', { priority: 'high' })
  })

  test('checks order before refunding', async ({ send }) => {
    const res = await send('Check order #111 and then refund it, wrong item')
    expect(res).toCallToolsInOrder(['lookup_order', 'process_refund'])
  })

  for (const orderId of ['AAA-111', 'BBB-222', '12345', 'ORD-99999']) {
    test(`extracts order ID "${orderId}" correctly`, async ({ send }) => {
      const res = await send(`Check status of order ${orderId}`)
      expect(res).toCallToolWith('lookup_order', { order_id: orderId })
    })
  }
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from pest_pytest import describe, test
from src.prompts import SUPPORT_PROMPT
from src.tools import support_tools

with describe("Customer Support Agent",
    system_prompt=SUPPORT_PROMPT,
    tools=support_tools,
) as suite:

    @test("looks up order when asked about status")
    async def test_lookup(send):
        res = await send("Where is my order #12345?")
        res.assert_calls_tool("lookup_order")
        res.assert_calls_tool_with("lookup_order", {"order_id": "12345"})
        res.assert_tool_call_count(1)

    @test("processes refund for damaged items")
    async def test_refund(send):
        res = await send("I want a refund for order #67890, the item was broken")
        res.assert_calls_tool("process_refund")
        res.assert_calls_tool_with_match("process_refund", {"order_id": "67890"})
        res.assert_not_calls_tool("escalate")

    @test("escalates angry customers with high priority")
    async def test_escalate(send):
        res = await send("THIS IS RIDICULOUS! NOTHING WORKS! GET ME A MANAGER!")
        res.assert_calls_tool("escalate")
        res.assert_calls_tool_with("escalate", {"priority": "high"})

    for order_id in ["AAA-111", "BBB-222", "12345", "ORD-99999"]:
        @test(f'extracts order ID "{order_id}" correctly')
        async def test_id(send, oid=order_id):
            res = await send(f"Check status of order {oid}")
            res.assert_calls_tool_with("lookup_order", {"order_id": oid})
```

</PluginBlock>
