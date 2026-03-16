::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# When to Use What

pest has several features that work together. Here's how to decide what to use and when.

## Decision flow

```
Do you know exactly what behavior to test?
├─ Yes → Write manual tests with matchers
│        Does the behavior involve tool calls?
│        ├─ Yes → Use tool call matchers (toCallTool, toCallToolWith, etc.)
│        └─ No  → Use text matchers (toContain, toMatch, toEqual)
│
│        Is "correct" hard to express as string matching?
│        ├─ Yes → Add judge matchers (toPassJudge)
│        └─ No  → Text matchers are enough
│
├─ No  → Use LLM-as-QA to discover what to test
│        Then review and keep the good cases
│
Need to choose between models?
├─ Yes → Configure multiple providers, run the same tests
│
Prompt too long or not performing well?
├─ Too long     → Use compressor
├─ Not accurate → Use optimizer
```

## Feature comparison

| Feature | Input | Output | When |
|---------|-------|--------|------|
| **Manual tests** | You write test cases | Pass/fail per test | You know what to test |
| **Text matchers** | Expected substrings, regex | Deterministic pass/fail | Checking specific content |
| **Tool matchers** | Expected tool names + args | Deterministic pass/fail | Verifying agent behavior |
| **Judge** (`toPassJudge`) | Natural language criteria | Score 0.0-1.0 | Behavior is subjective or nuanced |
| **QA** (`generateTestCases`) | System prompt + tools | Generated test cases | Finding blind spots |
| **QA + Judge** | System prompt → generated cases → judge scores | Weak spot report | Full automated coverage |
| **Model comparison** | Same tests, multiple providers | Ranked table | Choosing a provider |
| **Optimizer** | Prompt + failing tests | Improved prompt | Prompt isn't accurate enough |
| **Compressor** | Prompt + tests | Shorter prompt | Prompt is too long/expensive |

## Manual tests with matchers

**Best for:** Known requirements, regression testing, CI/CD.

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
test('answers factual questions', async ({ send }) => {
  const res = await send('What is the capital of France?')
  expect(res).toContain('Paris')
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
@test("answers factual questions")
async def test_factual(send):
    res = await send("What is the capital of France?")
    assert res.contains("Paris")
```

</PluginBlock>

## Judge matchers

**Best for:** Subjective quality, tone, helpfulness, safety.

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
test('helpful response', async ({ send }) => {
  const res = await send('How do I reset my password?')

  expect(res).toContain('password')
  await expect(res).toPassJudge('Provides clear, actionable reset instructions')
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
@test("helpful response")
async def test_helpful(send):
    res = await send("How do I reset my password?")

    assert res.contains("password")
    await res.assert_passes_judge("Provides clear, actionable reset instructions")
```

</PluginBlock>

**Tip:** Combine deterministic matchers with judge matchers. Use string/tool matchers for things that must be exact, and judge for everything else.

## LLM-as-QA

**Best for:** Discovering blind spots, generating edge cases, adversarial testing.

<PluginBlock plugin="vitest">

```typescript
import { generateTestCases } from '@pest/vitest'

const cases = await generateTestCases(qaProvider, SUPPORT_PROMPT, {
  tools: supportTools,
  categories: ['edge_cases', 'adversarial', 'tool_misuse'],
  count: 20,
})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { generateTestCases } from '@pest/jest'

const cases = await generateTestCases(qaProvider, SUPPORT_PROMPT, {
  tools: supportTools,
  categories: ['edge_cases', 'adversarial', 'tool_misuse'],
  count: 20,
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from pest_pytest import generate_test_cases

cases = await generate_test_cases(qa_provider, SUPPORT_PROMPT,
    tools=support_tools,
    categories=["edge_cases", "adversarial", "tool_misuse"],
    count=20,
)
```

</PluginBlock>

## Model comparison

**Best for:** Choosing which model to use, cost/quality tradeoffs.

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
describe('Support Agent', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
  // Omit providers to run against all configured providers
}, () => {
  test('handles refunds', async ({ send }) => {
    const res = await send('Refund order #12345')
    expect(res).toCallTool('process_refund')
  })
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
with describe("Support Agent",
    system_prompt=SUPPORT_PROMPT,
    tools=support_tools,
    # Omit providers to run against all configured providers
) as suite:

    @test("handles refunds")
    async def test_refund(send):
        res = await send("Refund order #12345")
        res.assert_calls_tool("process_refund")
```

</PluginBlock>

## Prompt optimizer

<PluginBlock plugin="vitest">

```typescript
import { optimizePrompt } from '@pest/vitest'

const result = await optimizePrompt(tuner, originalPrompt, block, provider, {
  maxIterations: 5,
})

if (result.improved) {
  console.log('Better prompt found:', result.best.prompt)
}
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { optimizePrompt } from '@pest/jest'

const result = await optimizePrompt(tuner, originalPrompt, block, provider, {
  maxIterations: 5,
})

if (result.improved) {
  console.log('Better prompt found:', result.best.prompt)
}
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from pest_pytest import optimize_prompt

result = await optimize_prompt(tuner, original_prompt, block, provider,
    max_iterations=5,
)

if result.improved:
    print(f"Better prompt found: {result.best.prompt}")
```

</PluginBlock>

## Prompt compressor

<PluginBlock plugin="vitest">

```typescript
import { compressPrompt } from '@pest/vitest'

const result = await compressPrompt(compressor, originalPrompt, block, provider, {
  targetReduction: 0.3,
})

console.log(`${result.reductionPercent.toFixed(0)}% shorter`)
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { compressPrompt } from '@pest/jest'

const result = await compressPrompt(compressor, originalPrompt, block, provider, {
  targetReduction: 0.3,
})

console.log(`${result.reductionPercent.toFixed(0)}% shorter`)
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from pest_pytest import compress_prompt

result = await compress_prompt(compressor, original_prompt, block, provider,
    target_reduction=0.3,
)

print(f"{result.reduction_percent:.0f}% shorter")
```

</PluginBlock>

## Putting it all together

1. **Write manual tests** for known requirements (matchers + judge)
2. **Run QA** to discover edge cases you missed
3. **Review and save** the best QA-generated cases
4. **Compare models** to pick the best provider
5. **Optimize** the prompt if tests are failing
6. **Compress** the prompt to save tokens
7. **Run everything in CI** to catch regressions
