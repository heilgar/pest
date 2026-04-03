# Multi-Model Evaluation

Compare how different LLM providers handle your prompts. Run the same cases against GPT-4o, Claude, Gemini, and others, then see the raw outputs side-by-side with scores, latency, and cost.

## Overview

Evaluation works in three steps:

1. Define eval cases in `*.eval.ts` files (prompts, matchers, rubrics)
2. Run `pest eval` to execute cases against configured providers
3. View results in the terminal or generate an HTML comparison report

Eval uses the providers and judge from your existing `pest.config.ts` — no duplication of API keys or model config.

## Setup

No extra packages needed. Eval is part of `@heilgar/pest-core` and `@heilgar/pest-cli`.

Make sure your `pest.config.ts` has multiple providers:

```ts
// pest.config.ts
import { defineConfig } from "@heilgar/pest-core";

export default defineConfig({
  providers: [
    { name: "gpt4o", type: "openai", model: "gpt-4o" },
    { name: "claude-sonnet", type: "anthropic", model: "claude-sonnet-4-20250514" },
    { name: "gemini-flash", type: "gemini", model: "gemini-2.5-flash" },
  ],
  judge: {
    provider: "claude-sonnet",
  },
});
```

## Write an eval suite

Create a `*.eval.ts` file. The `defineEval` function takes a sync or async function that returns the suite definition — full programmatic control over case generation.

```ts
// eval/customer-support.eval.ts
import { defineEval } from "@heilgar/pest-core";
import { systemPrompt, tools, toolExecutor } from "../src/agent";

export default defineEval(async () => ({
  // Which providers to compare (names from pest.config.ts)
  providers: ["gpt4o", "claude-sonnet", "gemini-flash"],

  // Defaults applied to all cases (overridable per case)
  defaults: {
    systemPrompt,
    tools,
    temperature: 0,
  },

  cases: [
    {
      name: "order lookup",
      messages: [{ role: "user", content: "Where is my order ORD-123?" }],
      matchers: [
        { type: "containsToolCall", args: ["lookup_order", { order_id: "ORD-123" }] },
        { type: "respondsWithinTokens", args: [500] },
      ],
      rubrics: [
        "Response references the order status clearly",
        "Tone is professional and helpful",
      ],
    },
    {
      name: "refund request",
      messages: [{ role: "user", content: "I want a refund for order ORD-456" }],
      matchers: [
        { type: "containsToolCall", args: ["lookup_order"] },
      ],
      rubrics: [
        "Acknowledges the refund request",
        "Asks for necessary details or provides next steps",
      ],
    },
  ],
}));
```

### Agentic cases

For multi-turn tool-calling flows, add the `agentic` field:

```ts
{
  name: "multi-step order resolution",
  messages: [{ role: "user", content: "Cancel order ORD-789 and refund my card" }],
  agentic: {
    toolExecutor,
    maxTurns: 5,
  },
  matchers: [
    { type: "containsToolCall", args: ["lookup_order"] },
    { type: "containsToolCall", args: ["cancel_order"] },
    { type: "containsToolCall", args: ["process_refund"] },
  ],
  rubrics: ["Completes the full cancellation and refund flow"],
}
```

Agentic cases use `sendAgentic()` under the hood. The full conversation (all turns, all tool calls) is captured and available in the report.

### Dynamic case generation

Since `defineEval` takes a function, you can generate cases programmatically:

```ts
// eval/from-dataset.eval.ts
import { defineEval } from "@heilgar/pest-core";
import { readFile } from "fs/promises";

export default defineEval(async () => {
  const dataset = JSON.parse(await readFile("./eval/fixtures/cases.json", "utf-8"));

  return {
    providers: ["gpt4o", "claude-sonnet"],
    cases: dataset.map((entry) => ({
      name: entry.name,
      messages: [{ role: "user", content: entry.prompt }],
      rubrics: [entry.expectedBehavior],
    })),
  };
});
```

### Per-case overrides

Any default can be overridden at the case level:

```ts
{
  name: "creative writing",
  messages: [{ role: "user", content: "Write a haiku about testing" }],
  temperature: 0.9,       // override default temperature
  maxTokens: 200,         // override default maxTokens
  systemPrompt: "You are a poet.", // override default systemPrompt
  rubrics: ["Response is a valid haiku with 5-7-5 syllable structure"],
}
```

## Run evaluations

### CLI

```bash
# Discover and run all *.eval.ts files
pest eval

# Run a specific suite
pest eval ./eval/customer-support.eval.ts

# Filter to specific providers
pest eval --provider gpt4o --provider claude-sonnet

# Generate HTML report
pest eval --html eval-report.html

# Generate JSON output
pest eval --json eval-results.json

# Both
pest eval --html eval-report.html --json eval-results.json
```

### Execution model

For each case, all providers run concurrently. Cases run sequentially (predictable ordering, easier to debug).

```
case "order lookup"
  -> gpt4o           -> response + matchers + rubrics
  -> claude-sonnet    -> response + matchers + rubrics
  -> gemini-flash     -> response + matchers + rubrics

case "refund request"
  -> gpt4o           -> response + matchers + rubrics
  -> ...
```

### CLI output

The terminal shows a summary after the run:

```
pest eval - customer-support (5 cases, 3 providers)

  Provider        Score   Pass    Latency    Cost
  gpt4o           0.87    9/10    1.2s avg   $0.03
  claude-sonnet   0.92    10/10   1.8s avg   $0.04
  gemini-flash    0.81    8/10    0.6s avg   $0.01
```

## Scoring

Each case+provider pair produces:

- **Matcher results** — pass/fail per matcher (deterministic)
- **Rubric scores** — 0-1 per rubric from the judge, with reasoning
- **Composite score** — weighted average of matcher pass rate and rubric scores (default: equal weight)
- **Metadata** — latency, token usage (input/output), estimated cost

## Output formats

### JSON

The JSON file is the source of truth. It contains all raw data — responses, tool calls, matcher results, rubric scores, and metadata per case per provider.

```json
{
  "timestamp": "2026-04-01T12:00:00.000Z",
  "config": {
    "providers": ["gpt4o", "claude-sonnet", "gemini-flash"],
    "judge": "claude-sonnet",
    "suites": ["eval/customer-support.eval.ts"]
  },
  "results": [
    {
      "case": "order lookup",
      "providers": {
        "gpt4o": {
          "response": {
            "text": "Let me look up order ORD-123 for you...",
            "toolCalls": [{ "name": "lookup_order", "args": { "order_id": "ORD-123" } }],
            "usage": { "inputTokens": 150, "outputTokens": 80 },
            "latencyMs": 1200
          },
          "matchers": [
            { "type": "containsToolCall", "pass": true },
            { "type": "respondsWithinTokens", "pass": true }
          ],
          "rubrics": [
            { "rubric": "Response references the order status clearly", "score": 0.9, "reasoning": "..." },
            { "rubric": "Tone is professional and helpful", "score": 0.85, "reasoning": "..." }
          ],
          "composite": 0.91,
          "costCents": 0.01
        },
        "claude-sonnet": { },
        "gemini-flash": { }
      }
    }
  ],
  "summary": {
    "gpt4o": { "score": 0.87, "passRate": "9/10", "avgLatencyMs": 1200, "totalCostCents": 3.2 },
    "claude-sonnet": { "score": 0.92, "passRate": "10/10", "avgLatencyMs": 1800, "totalCostCents": 4.1 },
    "gemini-flash": { "score": 0.81, "passRate": "8/10", "avgLatencyMs": 600, "totalCostCents": 1.0 }
  }
}
```

### HTML report

A standalone HTML file. Dark theme, no external dependencies. Reads from the JSON data embedded in the page.

**Case-by-case view** with tabs per provider:

- Click a provider tab to see its full response text, tool calls, and conversation turns (agentic)
- Below the response: matcher results (pass/fail), rubric scores with judge reasoning, latency, tokens, cost
- Switch between provider tabs to compare outputs for the same case

**Summary table** at the bottom:

- Row per provider: overall score, pass rate, avg latency, total cost, total tokens
- Sortable by any column

Add generated files to `.gitignore`:

```
eval-results.json
eval-report.html
```

## Next steps

- [Configuration](/guide/configuration) — provider and judge setup
- [Matchers](/architecture/matchers) — all available matchers for eval cases
- [CLI](/reference/cli) — full `pest eval` command reference
- [Reporters](/reference/reporters) — existing test reporter options
