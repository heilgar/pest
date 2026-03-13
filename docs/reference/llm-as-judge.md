# LLM-as-Judge

Use a powerful LLM to score responses on criteria you define in plain language. No complex scoring functions — describe what "good" looks like and let the judge evaluate.

## How it works

1. Your test sends a message and gets a response
2. `toPassJudge()` sends the prompt, response, and your criteria to the judge model
3. The judge scores from 0 to 1 with an explanation
4. The score is compared against a threshold to pass/fail

## Configuration

Set the judge model in your config:

```typescript
// pest.config.ts
export default defineConfig({
  providers: [/* ... */],
  judge: {
    provider: 'gpt-4o',
    temperature: 0,
    maxRetries: 2,
  },
});
```

## Usage

### Basic

```typescript
test('helpful response', async ({ send }) => {
  const res = await send('How do I reset my password?');
  await expect(res).toPassJudge('Provides clear step-by-step password reset instructions');
});
```

### Custom threshold

Default threshold is 0.7. Override per assertion:

```typescript
await expect(res).toPassJudge('Factually accurate', { threshold: 0.9 });
await expect(res).toPassJudge('Friendly tone', { threshold: 0.6 });
```

### Multiple criteria

Each criterion is scored independently. Passes if the average meets the threshold.

```typescript
await expect(res).toPassJudge([
  'Factually correct',
  'Concise (3 sentences or fewer)',
  'No jargon or technical terms',
], { threshold: 0.8 });
```

### Per-assertion judge provider

```typescript
await expect(res).toPassJudge('Factually correct', { provider: 'gpt-4o' });
await expect(res).toPassJudge('Sounds natural', { provider: 'claude-sonnet' });
```

## Semantic similarity

Check if a response means the same thing as expected text (not string matching):

```typescript
await expect(res).toBeSemanticallySimilar(
  'The capital of France is Paris, in the north of the country.',
  { threshold: 0.8 },
);
```

## Combining with tool assertions

```typescript
test('correct and polite refund', async ({ send }) => {
  const res = await send('Refund order #12345, damaged');

  // Deterministic checks
  expect(res).toCallTool('process_refund');
  expect(res).toCallToolWith('process_refund', { order_id: '12345' });

  // Semantic checks
  await expect(res).toPassJudge(
    'Confirms refund processing and expresses empathy about the damage',
  );
});
```

## Judge output

The judge returns structured results accessible in reporters:

```json
{
  "score": 0.85,
  "criteria_scores": [
    {
      "criteria": "Factually correct",
      "score": 0.95,
      "explanation": "Correctly identifies Paris as the capital with accurate details."
    },
    {
      "criteria": "Concise",
      "score": 0.75,
      "explanation": "Mostly concise but includes an unnecessary aside."
    }
  ]
}
```

## Reliability

LLM judges have inherent variability. pest mitigates this:

- **Temperature 0** by default
- **Retries** on failures (configurable)
- **Structured output** — judge returns JSON scores
- **Explanation required** — judge must justify its score

For high-stakes evaluation, run multiple passes:

```typescript
// In config
judge: {
  provider: 'gpt-4o',
  passes: 3,  // Average across 3 judge runs
}
```
