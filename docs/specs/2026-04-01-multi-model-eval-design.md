# Multi-Model Evaluation — Design Spec

## Problem

Users need to choose the best LLM provider for their specific prompts, tools, and use cases. Currently, pest supports testing against individual providers, but there is no built-in way to systematically compare multiple providers against the same set of cases and see results side-by-side.

## Goals

- Run the same evaluation cases against multiple LLM providers in a single command
- Support both single-turn (`send`) and multi-turn agentic (`sendAgentic`) evaluation
- Combine deterministic matchers with LLM-judged rubrics for scoring
- Produce JSON output as source of truth and HTML report for human review
- Integrate into existing `pest.config.ts` infrastructure (no config duplication)

## Non-goals

- Real-time streaming dashboard (static reports only)
- Automated model recommendation ("use this model") — users interpret results
- Prompt optimization — eval measures, does not modify

## Architecture

Eval lives inside `packages/core/src/eval/` as a core module. The CLI gets a new `eval` command in `packages/cli/`.

### Components

```
packages/core/src/eval/
  types.ts          — EvalSuite, EvalCase, EvalResult, EvalSummary
  define-eval.ts    — defineEval() factory function
  runner.ts         — discovers suites, executes cases, collects results
  scorer.ts         — runs matchers + rubrics, computes composite scores
  report-json.ts    — writes JSON output
  report-html.ts    — generates HTML comparison report

packages/cli/src/commands/
  eval.ts           — `pest eval` CLI command
```

### Data flow

```
*.eval.ts files
    |
    v
runner.ts (load config, resolve providers, execute)
    |
    v
scorer.ts (matchers + rubrics -> scores per case/provider)
    |
    v
EvalResult[]
    |
    +---> report-json.ts -> eval-results.json
    +---> report-html.ts -> eval-report.html (reads JSON)
    +---> CLI summary table (terminal)
```

## Eval suite config

### `defineEval(fn)`

Takes a sync or async function returning an `EvalSuite`:

```ts
interface EvalSuite {
  providers: string[];                 // names from pest.config.ts
  judge?: string;                      // override config judge
  defaults?: EvalCaseDefaults;         // applied to all cases
  cases: EvalCase[];
}

interface EvalCaseDefaults {
  systemPrompt?: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

interface EvalCase {
  name: string;
  messages: AgenticMessage[];
  systemPrompt?: string;               // overrides defaults
  tools?: ToolDefinition[];            // overrides defaults
  temperature?: number;                // overrides defaults
  maxTokens?: number;                  // overrides defaults
  matchers?: MatcherSpec[];            // deterministic checks
  rubrics?: string[];                  // LLM-judged criteria
  agentic?: {
    toolExecutor: ToolExecutor;
    maxTurns?: number;                 // default: 10
  };
}

interface MatcherSpec {
  type: string;                        // matcher name (e.g. "containsToolCall")
  args: unknown[];                     // arguments passed to the matcher
}
```

### Discovery

`pest eval` discovers `*.eval.ts` files from the working directory (recursive). A specific file or glob can be passed as CLI argument.

Provider names in the suite must match names in `pest.config.ts`. Unknown names cause an error with available providers listed.

## Execution

### Per-case strategy

For each case:
1. Resolve provider instances from config by name
2. Run all providers concurrently for the case (`Promise.all`)
3. Use `send()` for single-turn cases, `sendAgentic()` for cases with `agentic` field
4. Collect `PestResponse` per provider

Cases run sequentially (one case at a time).

### Scoring

Per case+provider pair:

1. **Matchers** — run each `MatcherSpec` against the response. Result: pass/fail per matcher.
2. **Rubrics** — for each rubric string, call `satisfiesCriteria(response, rubric, judge)`. Result: 0-1 score + reasoning per rubric.
3. **Composite score** — `(matcherPassRate + avgRubricScore) / 2`. If only matchers, composite = pass rate. If only rubrics, composite = avg rubric score.

### Error handling

If a provider call fails (timeout, API error, rate limit):
- Record the error in results (no score, no response)
- Continue with remaining providers for the case
- Show error in CLI output and report

## CLI command

```
pest eval [files...] [options]

Arguments:
  files           Eval suite files or globs (default: **/*.eval.ts)

Options:
  --provider, -p  Filter to specific provider(s) (repeatable)
  --json          Write JSON results to path
  --html          Write HTML report to path
  --config, -c    Path to pest config file (default: auto-detected)
  --verbose, -v   Show detailed output during execution
```

### Terminal output

Progress during execution:

```
pest eval - customer-support.eval.ts

  [1/5] order lookup
    gpt4o          0.91  1.2s  $0.01
    claude-sonnet  0.95  1.8s  $0.02
    gemini-flash   0.80  0.6s  $0.005

  [2/5] refund request
    ...
```

Summary after completion:

```
  Provider        Score   Pass    Latency    Cost
  gpt4o           0.87    9/10    1.2s avg   $0.03
  claude-sonnet   0.92    10/10   1.8s avg   $0.04
  gemini-flash    0.81    8/10    0.6s avg   $0.01
```

## JSON output

Structure:

```ts
interface EvalOutput {
  timestamp: string;
  config: {
    providers: string[];
    judge: string;
    suites: string[];
  };
  results: CaseResult[];
  summary: Record<string, ProviderSummary>;
}

interface CaseResult {
  case: string;                              // case name
  suite: string;                             // source file
  providers: Record<string, ProviderResult>;
}

interface ProviderResult {
  response: {
    text: string;
    toolCalls: ToolCall[];
    usage: { inputTokens: number; outputTokens: number };
    latencyMs: number;
    turns?: AgenticTurn[];                   // for agentic cases
  };
  matchers: { type: string; pass: boolean }[];
  rubrics: { rubric: string; score: number; reasoning: string }[];
  composite: number;
  costCents: number;
  error?: string;                            // if provider call failed
}

interface ProviderSummary {
  score: number;
  passRate: string;
  avgLatencyMs: number;
  totalCostCents: number;
  totalTokens: number;
}
```

## HTML report

Static HTML file, self-contained (embedded CSS/JS), dark theme. Data embedded as JSON in a `<script>` tag.

### Layout

**Case-by-case section** (main content):

Each case is a card with provider tabs. Selecting a tab shows:
- Full response text (full-width, readable)
- Tool calls (if any)
- Conversation turns (for agentic cases)
- Matcher results: pass/fail per matcher
- Rubric scores: score + judge reasoning per rubric
- Metadata: latency, tokens (input/output), cost

Tab switching is instant (client-side, all data pre-loaded).

**Summary table** (bottom of page):

| Provider | Score | Pass Rate | Avg Latency | Total Cost | Total Tokens |
|----------|-------|-----------|-------------|------------|--------------|
| gpt4o | 0.87 | 9/10 | 1.2s | $0.03 | 4.2k |
| claude-sonnet | 0.92 | 10/10 | 1.8s | $0.04 | 3.8k |
| gemini-flash | 0.81 | 8/10 | 0.6s | $0.01 | 5.1k |

Sortable by any column. Color-coded scores.

## Integration with existing code

### Reuses from core

- `createProvider()` / provider registry — resolve provider names to instances
- `send()` / `sendAgentic()` — execute LLM calls
- `loadConfig()` — load pest.config.ts
- Matcher functions from `matcher-logic.ts` — `containsToolCall`, `satisfiesCriteria`, etc.
- `estimateCostCents()` — cost calculation
- `resolveJudge()` / judge provider system — LLM-judged scoring

### New exports from core

- `defineEval` — suite definition factory
- `EvalSuite`, `EvalCase`, `EvalResult` — types
- `runEval()` — programmatic execution (for testing or CI integration)

### CLI

New `eval` command registered alongside existing `install`, `qa`, `exec`.
