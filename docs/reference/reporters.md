# Reporters

Reporters format and output test results. pest supports multiple output formats simultaneously.

## Configuration

```typescript
// pest.config.ts
export default defineConfig({
  reporter: {
    format: ['console', 'json'],
    outputDir: 'reports',
    verbose: false,
  },
});
```

## Console reporter

The default. Color-coded pass/fail output in the terminal.

```
pest v0.1.0

  Customer Support Agent (gpt-4o)
    [PASS] handles refund requests (score: 0.92)
      toCallTool('process_refund'): PASS
      toCallToolWith('process_refund', { order_id: '12345' }): PASS
      toPassJudge('polite and confirms refund'): PASS (0.92)
    [PASS] checks order status (score: 0.95)
      toCallTool('lookup_order'): PASS
      toHaveToolCallCount(1): PASS
    [FAIL] escalates angry customers (score: 0.45)
      toCallTool('escalate'): FAIL (called process_refund instead)
      toCallToolWith('escalate', { priority: 'high' }): FAIL

  2/3 passed | avg score: 0.77 | tools: 4/6 | 4.2s | $0.012
```

### Verbose mode

With `verbose: true`, shows full responses:

```
    [FAIL] escalates angry customers (score: 0.45)
      Response: "I understand your frustration. Let me process a refund..."
      Tool calls: [process_refund({ order_id: "unknown", reason: "complaint" })]
      Expected: escalate({ priority: "high" })
```

## JSON reporter

Structured results for programmatic analysis.

```bash
npx pest --format json
```

Output at `reports/2026-03-13T12-00-00.json`:

```json
{
  "timestamp": "2026-03-13T12:00:00Z",
  "suites": [
    {
      "name": "Customer Support Agent",
      "file": "tests/support.pest.ts",
      "providers": [
        {
          "name": "gpt-4o",
          "results": { "total": 3, "passed": 2, "failed": 1, "avgScore": 0.77 },
          "cases": [
            {
              "name": "handles refund requests",
              "passed": true,
              "score": 0.92,
              "latencyMs": 1200,
              "toolCalls": [
                { "name": "process_refund", "arguments": { "order_id": "12345" } }
              ],
              "matchers": [
                { "matcher": "toCallTool", "args": ["process_refund"], "passed": true },
                { "matcher": "toPassJudge", "args": ["polite..."], "score": 0.92, "passed": true }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## HTML reporter

Static HTML file with interactive results — open in any browser.

```bash
npx pest --format html
```

Includes: summary dashboard, per-provider charts, expandable test details, tool call visualization, filter and search.

## Multiple reporters

```typescript
reporter: {
  format: ['console', 'json', 'html'],
  outputDir: 'reports',
}
```

## Programmatic access

```typescript
import { run } from 'pest';

const results = await run({ tests: './tests/' });

console.log(results.summary);
// { total: 15, passed: 13, failed: 2, avgScore: 0.87 }

for (const suite of results.suites) {
  for (const caseResult of suite.cases) {
    if (!caseResult.passed) {
      console.log(`FAIL: ${caseResult.name}`);
      console.log(`  Tool calls: ${JSON.stringify(caseResult.toolCalls)}`);
    }
  }
}
```
