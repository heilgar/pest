# Reporters

pest provides a custom reporter that shows LLM-specific metrics alongside your test results — token usage, cost, latency, tool calls, judge scores, and a full LLM conversation log.

## Pest Reporter (vitest)

The pest reporter runs alongside vitest's default reporter. It adds per-test LLM metrics to the console output and generates JSON + HTML report files.

### Setup

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["@heilgar/pest-vitest/setup"],
    reporters: ["default", "@heilgar/pest-vitest/reporter"],
  },
});
```

::: tip
Use `@heilgar/pest-vitest/setup` instead of a custom setup file. It registers matchers **and** the beforeEach/afterEach hooks that capture LLM data for the reporter.
:::

### Options

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ["@heilgar/pest-vitest/setup"],
    reporters: [
      "default",
      ["@heilgar/pest-vitest/reporter", {
        verbose: true,                   // show judge reasoning in console
        showCost: true,                  // show cost estimates (default: true)
        logFile: "pest-log.json",        // JSON log path (false to disable)
        htmlFile: "pest-report.html",    // HTML report path (false to disable)
      }],
    ],
  },
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `verbose` | `boolean` | `false` | Show judge reasoning in console output |
| `showCost` | `boolean` | `true` | Show estimated cost per test |
| `logFile` | `string \| false` | `"pest-log.json"` | JSON log file path, or `false` to skip |
| `htmlFile` | `string \| false` | `"pest-report.html"` | HTML report file path, or `false` to skip |

### Console output

The reporter prints a line for each test that uses pest matchers:

```
  pest ✓ looks up order │ gpt4o-mini │ 1.4s │ 300→52 tok │ $0.0001 │ lookup_order
  pest ✓ does not leak prompt │ gpt4o-mini │ 1.0s │ 289→39 tok │ $0.0001
       ✓ toNotDisclose
  pest ✓ refuses harmful request │ gpt4o-mini │ 495ms │ 287→11 tok │ $0.0000
       ✓ toBeClassifiedAs

  pest 18 tests │ 3.9k tokens (3.1k→847) │ $0.0010 │ 8 judge calls │ 7 tool calls
```

Each line shows:
- **Provider** and model used
- **Latency** for the LLM call
- **Tokens** (input→output)
- **Estimated cost**
- **Tool calls** (if any)
- **Judge results** with matcher name and score (for LLM-judged matchers)

### JSON log (`pest-log.json`)

A structured log of every LLM call and matcher assertion. Useful for debugging, CI artifacts, or building custom dashboards.

```json
{
  "timestamp": "2026-03-16T22:42:18.242Z",
  "summary": {
    "tests": 18,
    "totalTokens": 3961,
    "inputTokens": 3086,
    "outputTokens": 875,
    "estimatedCost": "$0.0010",
    "judgeCount": 8,
    "toolCallCount": 7
  },
  "tests": [
    {
      "test": "acme store agent > looks up order",
      "status": "passed",
      "sends": [
        {
          "input": "I need the details for order ORD-12345",
          "output": "",
          "systemPrompt": "You are a customer support agent...",
          "provider": "gpt4o-mini",
          "model": "gpt-4o-mini",
          "latencyMs": 1427.6,
          "usage": { "inputTokens": 300, "outputTokens": 52, "totalTokens": 352 },
          "toolCalls": [
            { "name": "lookup_order", "args": { "order_id": "ORD-12345" } }
          ]
        }
      ],
      "matchers": [
        { "matcher": "toContainToolCall", "pass": true }
      ]
    }
  ]
}
```

The `sends` array captures the full LLM conversation — input message, system prompt, output text, tool calls, and usage. This is the raw data behind the HTML report.

### HTML report (`pest-report.html`)

A standalone HTML file you can open in any browser. Dark theme, no external dependencies.

**Summary dashboard** at the top shows:
- Total tests, tokens, estimated cost
- Judge call count, tool call count
- Input→output token breakdown

**Expandable test cards** — click any test to see:
- Full system prompt (purple)
- User input message (blue)
- Assistant response (green)
- Tool calls with arguments
- Matcher assertions with pass/fail, scores, and judge reasoning

Add to `.gitignore`:

```
pest-log.json
pest-report.html
```

## Pest Reporter (jest)

Same capabilities as the vitest reporter. Requires `--runInBand` (the in-memory accumulator needs tests and reporter in the same process — typical for LLM tests anyway).

### Setup

```js
// jest.config.js
export default {
  setupFilesAfterFramework: ['@heilgar/pest-jest/setup'],
  reporters: [
    'default',
    ['@heilgar/pest-jest/reporter', { showCost: true }],
  ],
};
```

Same options as the vitest reporter: `verbose`, `showCost`, `logFile`, `htmlFile`.

## Default test runner output

pest matchers work with any vitest/jest/Playwright reporter. Without the pest reporter, you still get clear error messages on failures:

```
  ● Customer Support > escalates angry customers

    Expected to call tool "escalate", but it was not called.
    Called: [process_refund]
```

LLM-judged matcher failures include the judge's reasoning:

```
  ● Geography > knows capital cities

    Expected response to match semantic meaning of "Paris is the capital"
    (threshold: 4/5, score: 2/5).
    Reasoning: The response discusses Paris as a tourist destination,
    not as the capital of France.
```

All standard framework reporters work as-is:

```bash
# vitest
npx vitest --reporter=json --outputFile=results.json
npx vitest --reporter=junit --outputFile=results.xml

# jest
npx jest --json --outputFile=results.json

# playwright
npx playwright test --reporter=html
```

The pest reporter adds LLM-specific data on top — it doesn't replace the default output.
