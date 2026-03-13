# Model Comparison

Run the same tests against multiple LLMs to find which model performs best for your use case.

## Setup

Configure multiple providers:

```typescript
// pest.config.ts
export default defineConfig({
  providers: [
    { name: 'gpt-4o', type: 'openai', model: 'gpt-4o', apiKey: process.env.OPENAI_API_KEY },
    { name: 'claude-sonnet', type: 'anthropic', model: 'claude-sonnet-4-20250514', apiKey: process.env.ANTHROPIC_API_KEY },
    { name: 'gpt-4o-mini', type: 'openai', model: 'gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY },
    { name: 'gemini-2', type: 'gemini', model: 'gemini-2.5-flash', apiKey: process.env.GOOGLE_AI_API_KEY },
    { name: 'grok-4', type: 'xai', model: 'grok-4', apiKey: process.env.XAI_API_KEY },
    { name: 'llama-local', type: 'ollama', model: 'llama3.2' },
  ],
});
```

## Running comparisons

In your test suite, specify multiple providers:

```typescript
describe('Customer Support Agent', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
  providers: ['gpt-4o', 'claude-sonnet', 'gemini-2', 'grok-4', 'llama-local'],
}, () => {
  // Tests run against ALL listed providers
  test('handles refunds', async ({ send }) => {
    const res = await send('Refund order #12345, damaged');
    expect(res).toCallTool('process_refund');
    await expect(res).toPassJudge('Polite and confirms refund');
  });
});
```

Or via CLI:

```bash
npx pest --providers gpt-4o,claude-sonnet,llama-local
npx pest compare tests/support.pest.ts
```

## Output

```
pest Model Comparison - Customer Support Agent

Tests: 15 | Providers: 5

Overall Ranking:
+-----------------+-------+----------+-----------+----------+---------+---------+
| Provider        | Score | Accuracy | Relevance | Tool Acc | Latency | Cost    |
+-----------------+-------+----------+-----------+----------+---------+---------+
| claude-sonnet   | 0.93  | 0.95     | 0.94      | 14/15    | 1.2s    | $0.042  |
| gpt-4o          | 0.91  | 0.93     | 0.92      | 14/15    | 0.9s    | $0.038  |
| grok-4          | 0.89  | 0.91     | 0.90      | 14/15    | 1.0s    | $0.045  |
| gemini-2        | 0.87  | 0.89     | 0.88      | 13/15    | 0.6s    | $0.010  |
| llama-local     | 0.74  | 0.78     | 0.76      | 10/15    | 2.1s    | $0.000  |
+-----------------+-------+----------+-----------+----------+---------+---------+

Per-tool accuracy:
+-----------------+----------------+---------------+----------+
| Provider        | process_refund | lookup_order  | escalate |
+-----------------+----------------+---------------+----------+
| claude-sonnet   | 5/5            | 5/5           | 4/5      |
| gpt-4o          | 5/5            | 5/5           | 4/5      |
| grok-4          | 5/5            | 5/5           | 4/5      |
| gemini-2        | 5/5            | 5/5           | 3/5      |
| llama-local     | 4/5            | 4/5           | 2/5      |
+-----------------+----------------+---------------+----------+
```

## Programmatic access

```typescript
import { compare } from 'pest';

const results = await compare({
  tests: './tests/support.pest.ts',
  providers: ['gpt-4o', 'claude-sonnet', 'llama-local'],
  tag: 'v2-prompt',
});

for (const ranking of results.rankings) {
  console.log(`${ranking.provider}: ${ranking.overallScore} | ${ranking.toolAccuracy}`);
}
```

## Historical tracking

Tag comparison runs and view trends:

```bash
npx pest compare tests/support.pest.ts --tag "v2-prompt"
npx pest history tests/support.pest.ts
```

```
Comparison History - Customer Support Agent
+------------+-----------------+-------+----------+
| Tag        | Provider        | Score | Tool Acc |
+------------+-----------------+-------+----------+
| v1-prompt  | claude-sonnet   | 0.85  | 12/15    |
| v2-prompt  | claude-sonnet   | 0.93  | 14/15    |
| v1-prompt  | gpt-4o          | 0.83  | 11/15    |
| v2-prompt  | gpt-4o          | 0.91  | 14/15    |
+------------+-----------------+-------+----------+
```
