::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# Model Comparison

Run the same tests against multiple LLMs to find which model performs best for your use case.

## Setup

Configure multiple providers:

<PluginBlock plugin="vitest">

```typescript
// pest.config.ts
import { defineConfig } from '@pest/vitest'

export default defineConfig({
  providers: [
    { name: 'gpt-4o', type: 'openai', model: 'gpt-4o', apiKey: process.env.OPENAI_API_KEY },
    { name: 'claude-sonnet', type: 'anthropic', model: 'claude-sonnet-4-20250514', apiKey: process.env.ANTHROPIC_API_KEY },
    { name: 'gemini-2', type: 'gemini', model: 'gemini-2.5-flash', apiKey: process.env.GOOGLE_AI_API_KEY },
    { name: 'grok-4', type: 'xai', model: 'grok-4', apiKey: process.env.XAI_API_KEY },
    { name: 'llama-local', type: 'ollama', model: 'llama3.2' },
  ],
})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
// pest.config.ts
import { defineConfig } from '@pest/jest'

export default defineConfig({
  providers: [
    { name: 'gpt-4o', type: 'openai', model: 'gpt-4o', apiKey: process.env.OPENAI_API_KEY },
    { name: 'claude-sonnet', type: 'anthropic', model: 'claude-sonnet-4-20250514', apiKey: process.env.ANTHROPIC_API_KEY },
    { name: 'gemini-2', type: 'gemini', model: 'gemini-2.5-flash', apiKey: process.env.GOOGLE_AI_API_KEY },
    { name: 'grok-4', type: 'xai', model: 'grok-4', apiKey: process.env.XAI_API_KEY },
    { name: 'llama-local', type: 'ollama', model: 'llama3.2' },
  ],
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```yaml
# pest.config.yaml
providers:
  - name: gpt-4o
    type: openai
    model: gpt-4o
    api_key: ${OPENAI_API_KEY}
  - name: claude-sonnet
    type: anthropic
    model: claude-sonnet-4-20250514
    api_key: ${ANTHROPIC_API_KEY}
  - name: gemini-2
    type: gemini
    model: gemini-2.5-flash
    api_key: ${GOOGLE_AI_API_KEY}
  - name: llama-local
    type: ollama
    model: llama3.2
```

</PluginBlock>

## Running comparisons

When multiple providers are configured, pest automatically runs all tests against each provider and shows a comparison table.

### Limit to specific providers

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
describe('Customer Support Agent', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
  providers: ['gpt-4o', 'claude-sonnet', 'gemini-2'],
}, () => {
  test('handles refunds', async ({ send }) => {
    const res = await send('Refund order #12345, damaged')
    expect(res).toCallTool('process_refund')
    await expect(res).toPassJudge('Polite and confirms refund')
  })
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
with describe("Customer Support Agent",
    system_prompt=SUPPORT_PROMPT,
    tools=support_tools,
    providers=["gpt-4o", "claude-sonnet", "gemini-2"],
) as suite:

    @test("handles refunds")
    async def test_refund(send):
        res = await send("Refund order #12345, damaged")
        res.assert_calls_tool("process_refund")
        await res.assert_passes_judge("Polite and confirms refund")
```

</PluginBlock>

Without `providers`, tests run against all configured providers.

## Output

```
pest v0.0.1

  Customer Support Agent (gpt-4o)
    [PASS] handles refunds 1.2s
    [PASS] checks order status 0.9s
    [PASS] escalates angry customers 1.1s

  Customer Support Agent (claude-sonnet)
    [PASS] handles refunds 1.8s
    [PASS] checks order status 1.2s
    [FAIL] escalates angry customers 1.5s

  Customer Support Agent (llama-local)
    [PASS] handles refunds 0.3s
    [FAIL] checks order status 0.2s
    [FAIL] escalates angry customers 0.4s

  Model Comparison

  #   Provider            Pass Rate   Passed    Failed    Avg Time
  ──────────────────────────────────────────────────────────────────
  1.  gpt-4o              100%        3/3       0         1.1s
  2.  claude-sonnet        67%        2/3       1         1.5s
  3.  llama-local          33%        1/3       2         0.3s
```

## Programmatic access

<PluginBlock plugin="vitest">

```typescript
import { buildComparisonTable } from '@pest/vitest'

const stats = buildComparisonTable(results)

for (const s of stats) {
  console.log(`${s.provider}: ${(s.passRate * 100).toFixed(0)}% pass rate, avg ${s.avgDurationMs}ms`)
}
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { buildComparisonTable } from '@pest/jest'

const stats = buildComparisonTable(results)

for (const s of stats) {
  console.log(`${s.provider}: ${(s.passRate * 100).toFixed(0)}% pass rate, avg ${s.avgDurationMs}ms`)
}
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from pest_pytest import build_comparison_table

stats = build_comparison_table(results)

for s in stats:
    print(f"{s.provider}: {s.pass_rate * 100:.0f}% pass rate, avg {s.avg_duration_ms}ms")
```

</PluginBlock>
