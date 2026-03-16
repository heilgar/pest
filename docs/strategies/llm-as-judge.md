::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# LLM-as-Judge

Use a powerful LLM to score responses on criteria you define in plain language. No complex scoring functions — describe what "good" looks like and let the judge evaluate.

## How it works

1. Your test sends a message and gets a response
2. `toPassJudge()` sends the response and your criteria to the judge model
3. The judge scores from 0.0 to 1.0 with reasoning
4. The score is compared against a threshold to pass/fail

## Configuration

<PluginBlock plugin="vitest">

```typescript
// pest.config.ts
import { defineConfig } from '@pest/vitest'

export default defineConfig({
  providers: [/* ... */],
  judge: {
    provider: 'gpt-4o',
    temperature: 0,
    threshold: 0.7,
  },
})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
// pest.config.ts
import { defineConfig } from '@pest/jest'

export default defineConfig({
  providers: [/* ... */],
  judge: {
    provider: 'gpt-4o',
    temperature: 0,
    threshold: 0.7,
  },
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```yaml
# pest.config.yaml
judge:
  provider: gpt-4o
  temperature: 0
  threshold: 0.7
```

</PluginBlock>

## Usage

### Basic

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
test('helpful response', async ({ send }) => {
  const res = await send('How do I reset my password?')
  await expect(res).toPassJudge('Provides clear step-by-step password reset instructions')
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
@test("helpful response")
async def test_helpful(send):
    res = await send("How do I reset my password?")
    await res.assert_passes_judge("Provides clear step-by-step password reset instructions")
```

</PluginBlock>

### Custom threshold

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
await expect(res).toPassJudge('Factually accurate', { threshold: 0.9 })
await expect(res).toPassJudge('Friendly tone', { threshold: 0.6 })
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
await res.assert_passes_judge("Factually accurate", threshold=0.9)
await res.assert_passes_judge("Friendly tone", threshold=0.6)
```

</PluginBlock>

### Negation

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
await expect(res).not.toPassJudge('Contains harmful or misleading content')
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
await res.assert_not_passes_judge("Contains harmful or misleading content")
```

</PluginBlock>

## Semantic similarity

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
await expect(res).toBeSemanticallySimilar(
  'The capital of France is Paris, in the north of the country.',
  { threshold: 0.8 },
)
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
await res.assert_semantically_similar(
    "The capital of France is Paris, in the north of the country.",
    threshold=0.8,
)
```

</PluginBlock>

## Combining with tool assertions

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
test('correct and polite refund', async ({ send }) => {
  const res = await send('Refund order #12345, damaged')

  expect(res).toCallTool('process_refund')
  expect(res).toCallToolWith('process_refund', { order_id: '12345' })

  await expect(res).toPassJudge(
    'Confirms refund processing and expresses empathy about the damage',
  )
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
@test("correct and polite refund")
async def test_refund(send):
    res = await send("Refund order #12345, damaged")

    res.assert_calls_tool("process_refund")
    res.assert_calls_tool_with("process_refund", {"order_id": "12345"})

    await res.assert_passes_judge(
        "Confirms refund processing and expresses empathy about the damage"
    )
```

</PluginBlock>

## Judge output

The judge returns a score and reasoning:

```json
{
  "score": 0.85,
  "reasoning": "Response correctly identifies Paris as the capital with accurate details."
}
```

## Custom judge prompt

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
// pest.config.ts
export default defineConfig({
  providers: [...],
  prompts: {
    judge: `You are a strict evaluator for medical content.
Score from 0.0 to 1.0. Penalize any inaccuracies heavily.
Respond in JSON: {"score": <number>, "reasoning": "<explanation>"}`,
  },
})
```

Or at runtime:

```typescript
import { setPrompts, defaultPrompts } from '@pest/vitest'  // or @pest/jest

setPrompts({
  judge: `${defaultPrompts.judge}\n\nBe extra strict about factual accuracy.`,
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```yaml
# pest.config.yaml
prompts:
  judge: |
    You are a strict evaluator for medical content.
    Score from 0.0 to 1.0. Penalize any inaccuracies heavily.
    Respond in JSON: {"score": <number>, "reasoning": "<explanation>"}
```

</PluginBlock>

## Reliability

LLM judges have inherent variability. pest mitigates this:

- **Temperature 0** by default for deterministic scoring
- **Structured output** — judge returns JSON scores
- **Reasoning required** — judge must justify its score
- **Threshold tuning** — adjust per-assertion to account for variance
