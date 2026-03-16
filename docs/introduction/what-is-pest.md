::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# What is pest?

**pest** (Prompt Evaluation & Scoring Toolkit) is a lightweight library for testing LLM prompts. It gives you the same `describe` / `test` / `expect` API you know from vitest and jest — applied to LLM behavior.

## The core idea

Other tools make you write tests in YAML or JSON config files. pest uses code:

<PluginBlock plugin="vitest">

```typescript
// tests/support.pest.ts
import { describe, test } from '@pest/vitest'
import { SUPPORT_PROMPT } from '../src/prompts/support'
import { supportTools } from '../src/tools/support'

describe('Customer Support', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
}, () => {

  test('processes refund requests', async ({ send }) => {
    const res = await send('Refund order #12345, it arrived damaged')

    expect(res).toCallTool('process_refund')
    expect(res).toCallToolWith('process_refund', { order_id: '12345' })
    await expect(res).toPassJudge('Confirms refund and is empathetic')
  })

})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
// tests/support.pest.ts
import { describe, test } from '@pest/jest'
import { SUPPORT_PROMPT } from '../src/prompts/support'
import { supportTools } from '../src/tools/support'

describe('Customer Support', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
}, () => {

  test('processes refund requests', async ({ send }) => {
    const res = await send('Refund order #12345, it arrived damaged')

    expect(res).toCallTool('process_refund')
    expect(res).toCallToolWith('process_refund', { order_id: '12345' })
    await expect(res).toPassJudge('Confirms refund and is empathetic')
  })

})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
# tests/test_support.pest.py
from pest_pytest import describe, test
from src.prompts import SUPPORT_PROMPT
from src.tools import support_tools

with describe("Customer Support",
    system_prompt=SUPPORT_PROMPT,
    tools=support_tools,
) as suite:

    @test("processes refund requests")
    async def test_refund(send):
        res = await send("Refund order #12345, it arrived damaged")

        res.assert_calls_tool("process_refund")
        res.assert_calls_tool_with("process_refund", {"order_id": "12345"})
        await res.assert_passes_judge("Confirms refund and is empathetic")
```

</PluginBlock>

Your test files are real code — import your actual prompt strings, tool definitions, and constants directly from your project.

## What you can test

| Capability | What it checks |
|-----------|----------------|
| **Text matchers** | Does the response contain specific text? Match a pattern? |
| **Tool call matchers** | Did the model call the right tool? With the right arguments? In the right order? |
| **LLM-as-Judge** | Does the response meet qualitative criteria like "is helpful" or "is factually accurate"? |
| **LLM-as-QA** | Automatically generate edge cases and adversarial inputs you haven't thought of |
| **Model comparison** | Which provider performs best on your prompts? |
| **Prompt tuning** | Iteratively improve or compress a prompt until tests pass |

## Why code-based tests

**Import your project's code.** The prompt string you test is the same variable your app uses. If the prompt changes, your imports update automatically.

**Full language power.** Loops, conditionals, helper functions, parameterized tests — no config language limitations:

<PluginBlock plugin="vitest">

```typescript
for (const status of ORDER_STATUSES) {
  test(`explains "${status}" order status`, async ({ send }) => {
    const res = await send(`My order status shows ${status}`)
    await expect(res).toPassJudge(`Correctly explains what "${status}" means`)
  })
}
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
for (const status of ORDER_STATUSES) {
  test(`explains "${status}" order status`, async ({ send }) => {
    const res = await send(`My order status shows ${status}`)
    await expect(res).toPassJudge(`Correctly explains what "${status}" means`)
  })
}
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
for status in ORDER_STATUSES:
    @test(f'explains "{status}" order status')
    async def test_status(send, s=status):
        res = await send(f"My order status shows {s}")
        await res.assert_passes_judge(f'Correctly explains what "{s}" means')
```

</PluginBlock>

**Familiar.** If you know vitest or jest, you know pest.

## Next steps

- [Choosing a Plugin](/introduction/choosing-a-plugin) — vitest, jest, or pytest? Pick your setup
- [Providers](/concepts/providers) — configure OpenAI, Anthropic, Gemini, and more
