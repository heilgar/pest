::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# Writing Tests

pest tests use a familiar `describe` / `test` / `expect` API inspired by vitest and jest. Tests are files that import your project's code directly.

## Basic structure

<PluginBlock plugin="vitest">

```typescript
// tests/my-bot.pest.ts
import { describe, test } from '@pest/vitest'

describe('My Bot', {
  systemPrompt: 'You are a helpful assistant.',
}, () => {

  test('answers questions', async ({ send }) => {
    const res = await send('What is 2+2?')
    expect(res).toContain('4')
  })

})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
// tests/my-bot.pest.ts
import { describe, test } from '@pest/jest'

describe('My Bot', {
  systemPrompt: 'You are a helpful assistant.',
}, () => {

  test('answers questions', async ({ send }) => {
    const res = await send('What is 2+2?')
    expect(res).toContain('4')
  })

})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
# tests/test_my_bot.pest.py
from pest_pytest import describe, test

with describe("My Bot",
    system_prompt="You are a helpful assistant."
) as suite:

    @test("answers questions")
    async def test_answers(send):
        res = await send("What is 2+2?")
        assert res.contains("4")
```

</PluginBlock>

## `describe(name, options, fn)`

Groups related tests. Sets the system prompt, tools, and other options shared across tests.

<PluginBlock plugin="vitest">

```typescript
describe('Suite name', {
  systemPrompt: string,              // Required: the prompt being tested
  tools?: ToolDefinition[],          // Optional: tool definitions
  providers?: string[],              // Optional: limit to specific providers
  temperature?: number,              // Optional: override temperature
}, () => {
  // tests go here
})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
describe('Suite name', {
  systemPrompt: string,              // Required: the prompt being tested
  tools?: ToolDefinition[],          // Optional: tool definitions
  providers?: string[],              // Optional: limit to specific providers
  temperature?: number,              // Optional: override temperature
}, () => {
  // tests go here
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
with describe("Suite name",
    system_prompt="...",       # Required
    tools=my_tools,            # Optional
    providers=["gpt-4o"],      # Optional
    temperature=0,             # Optional
) as suite:
    # tests go here
```

</PluginBlock>

### Importing prompts from your project

<PluginBlock plugin="vitest">

```typescript
import { describe, test } from '@pest/vitest'
import { SUPPORT_PROMPT } from '../src/prompts/support'
import { supportTools } from '../src/tools'

describe('Support Agent', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
}, () => {
  // ...
})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { describe, test } from '@pest/jest'
import { SUPPORT_PROMPT } from '../src/prompts/support'
import { supportTools } from '../src/tools'

describe('Support Agent', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
}, () => {
  // ...
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from pest_pytest import describe, test
from src.prompts import SUPPORT_PROMPT
from src.tools import support_tools

with describe("Support Agent",
    system_prompt=SUPPORT_PROMPT,
    tools=support_tools,
) as suite:
    pass  # tests go here
```

</PluginBlock>

## `test(name, fn)`

Defines a single test case. The callback receives a context object with `send`.

<PluginBlock plugin="vitest">

```typescript
test('test name', async ({ send }) => {
  const res = await send('user message')
  expect(res).toContain('expected')
})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
test('test name', async ({ send }) => {
  const res = await send('user message')
  expect(res).toContain('expected')
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
@test("test name")
async def test_example(send):
    res = await send("user message")
    assert res.contains("expected")
```

</PluginBlock>

### `send(message)`

Sends a user message to the LLM with the suite's system prompt and tools. Returns a response object.

<PluginBlock plugin="vitest">

```typescript
const res = await send('Hello, can you help me?')

res.text        // Response text content
res.toolCalls   // Array of tool calls made
res.usage       // Token usage { promptTokens, completionTokens, totalTokens }
res.latencyMs   // Response time in ms
res.provider    // Provider name
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
const res = await send('Hello, can you help me?')

res.text        // Response text content
res.toolCalls   // Array of tool calls made
res.usage       // Token usage { promptTokens, completionTokens, totalTokens }
res.latencyMs   // Response time in ms
res.provider    // Provider name
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
res = await send("Hello, can you help me?")

res.text         # Response text content
res.tool_calls   # List of tool calls made
res.usage        # Token usage dict
res.latency_ms   # Response time in ms
res.provider     # Provider name
```

</PluginBlock>

## Parameterized tests

<PluginBlock plugin="vitest">

```typescript
import { ORDER_IDS } from '../src/fixtures'

describe('Order Lookup', { systemPrompt: PROMPT, tools }, () => {

  for (const orderId of ORDER_IDS) {
    test(`looks up order ${orderId}`, async ({ send }) => {
      const res = await send(`Where is my order #${orderId}?`)
      expect(res).toCallTool('check_order_status')
      expect(res).toCallToolWith('check_order_status', { order_id: orderId })
    })
  }

})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { ORDER_IDS } from '../src/fixtures'

describe('Order Lookup', { systemPrompt: PROMPT, tools }, () => {

  for (const orderId of ORDER_IDS) {
    test(`looks up order ${orderId}`, async ({ send }) => {
      const res = await send(`Where is my order #${orderId}?`)
      expect(res).toCallTool('check_order_status')
      expect(res).toCallToolWith('check_order_status', { order_id: orderId })
    })
  }

})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from src.fixtures import ORDER_IDS

with describe("Order Lookup", system_prompt=PROMPT, tools=tools) as suite:

    for order_id in ORDER_IDS:
        @test(f"looks up order {order_id}")
        async def test_order(send, oid=order_id):
            res = await send(f"Where is my order #{oid}?")
            res.assert_calls_tool("check_order_status")
            res.assert_calls_tool_with("check_order_status", {"order_id": oid})
```

</PluginBlock>

### Using `test.each`

<PluginBlock plugin="vitest">

```typescript
test.each(['apple', 'banana', 'cherry'])(
  'handles %s',
  async (item, { send }) => {
    const res = await send(`Tell me about ${item}`)
    await expect(res).toPassJudge(`Provides accurate information about ${item}`)
  },
)
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
test.each(['apple', 'banana', 'cherry'])(
  'handles %s',
  async (item, { send }) => {
    const res = await send(`Tell me about ${item}`)
    await expect(res).toPassJudge(`Provides accurate information about ${item}`)
  },
)
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
import pytest

@pytest.mark.parametrize("item", ["apple", "banana", "cherry"])
@test("handles {item}")
async def test_item(send, item):
    res = await send(f"Tell me about {item}")
    await res.assert_passes_judge(f"Provides accurate information about {item}")
```

</PluginBlock>

## Lifecycle hooks

<PluginBlock plugin="vitest">

```typescript
describe('My Suite', { systemPrompt: PROMPT }, () => {

  beforeAll(() => { /* run once before all tests */ })
  afterAll(() => { /* run once after all tests */ })
  beforeEach(() => { /* run before each test */ })
  afterEach(() => { /* run after each test */ })

  test('...', async ({ send }) => { /* ... */ })
})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
describe('My Suite', { systemPrompt: PROMPT }, () => {

  beforeAll(() => { /* run once before all tests */ })
  afterAll(() => { /* run once after all tests */ })
  beforeEach(() => { /* run before each test */ })
  afterEach(() => { /* run after each test */ })

  test('...', async ({ send }) => { /* ... */ })
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
with describe("My Suite", system_prompt=PROMPT) as suite:

    @suite.before_all
    def setup():
        pass  # run once before all tests

    @suite.after_all
    def teardown():
        pass

    @test("...")
    async def test_example(send):
        pass
```

</PluginBlock>

## Skipping and focusing tests

<PluginBlock plugin="vitest">

```typescript
test.skip('not ready yet', async ({ send }) => { /* skipped */ })
test.only('debug this one', async ({ send }) => { /* only this runs */ })
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
test.skip('not ready yet', async ({ send }) => { /* skipped */ })
test.only('debug this one', async ({ send }) => { /* only this runs */ })
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
@test.skip("not ready yet")
async def test_skipped(send):
    pass

@test.only("debug this one")
async def test_focused(send):
    pass
```

</PluginBlock>

## Running tests

<PluginBlock plugin="vitest">

```bash
# Run all test files
npx vitest

# Run only pest files
npx vitest --include '**/*.pest.ts'

# Watch mode
npx vitest --watch
```

</PluginBlock>

<PluginBlock plugin="jest">

```bash
# Run all test files
npx jest

# Run only pest files
npx jest --testPathPattern='\.pest\.ts$'
```

</PluginBlock>

<PluginBlock plugin="pytest">

```bash
# Run all test files
pytest tests/

# Run only pest files
pytest tests/ -k "pest"

# Watch mode (with pytest-watch)
ptw tests/
```

</PluginBlock>
