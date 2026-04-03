# Multi-Model Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pest eval` CLI command that runs prompt cases against multiple LLM providers, scores them with matchers + rubrics, and outputs JSON + HTML comparison reports.

**Architecture:** New `eval/` module inside `packages/core/src/` with types, runner, scorer, and report generators. New `eval` command in `packages/cli/`. Reuses existing `send()`, `sendAgentic()`, matchers, config loader, pricing, and judge system.

**Tech Stack:** TypeScript, citty (CLI), valibot (validation), existing pest-core infrastructure.

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `packages/core/src/eval/types.ts` | `EvalSuite`, `EvalCase`, `EvalResult`, `EvalOutput` interfaces |
| `packages/core/src/eval/define-eval.ts` | `defineEval()` factory function |
| `packages/core/src/eval/runner.ts` | Suite discovery, loading, parallel execution across providers |
| `packages/core/src/eval/scorer.ts` | Run matchers + rubrics against responses, compute composite scores |
| `packages/core/src/eval/report-json.ts` | Build and write JSON output |
| `packages/core/src/eval/report-html.ts` | Build HTML comparison report with tabbed provider view |
| `packages/core/src/eval/report-cli.ts` | Terminal table output (progress + summary) |
| `packages/core/src/eval/index.ts` | Re-exports for the eval module |
| `packages/cli/src/commands/eval.ts` | `pest eval` CLI command |

### Modified files

| File | Change |
|------|--------|
| `packages/core/src/index.ts` | Export `defineEval`, eval types, `runEval` |
| `packages/cli/src/cli.ts` | Register `eval` subcommand |

---

### Task 1: Eval Types

**Files:**
- Create: `packages/core/src/eval/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// packages/core/src/eval/types.ts
import type {
  AgenticMessage,
  PestResponse,
  ToolCall,
  ToolDefinition,
  ToolExecutor,
} from '../types.js';

export interface MatcherSpec {
  type: string;
  args: unknown[];
}

export interface EvalCaseDefaults {
  systemPrompt?: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface EvalCase {
  name: string;
  messages: AgenticMessage[];
  systemPrompt?: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  matchers?: MatcherSpec[];
  rubrics?: string[];
  agentic?: {
    toolExecutor: ToolExecutor;
    maxTurns?: number;
  };
}

export interface EvalSuite {
  providers: string[];
  judge?: string;
  defaults?: EvalCaseDefaults;
  cases: EvalCase[];
}

export type EvalSuiteFactory = () => EvalSuite | Promise<EvalSuite>;

export interface MatcherResultEntry {
  type: string;
  pass: boolean;
}

export interface RubricResultEntry {
  rubric: string;
  score: number;
  reasoning: string;
}

export interface ProviderCaseResult {
  response: {
    text: string;
    toolCalls: ToolCall[];
    usage: { inputTokens: number; outputTokens: number };
    latencyMs: number;
  };
  matchers: MatcherResultEntry[];
  rubrics: RubricResultEntry[];
  composite: number;
  costCents: number;
  error?: string;
}

export interface CaseResult {
  case: string;
  suite: string;
  providers: Record<string, ProviderCaseResult>;
}

export interface ProviderSummary {
  score: number;
  passRate: string;
  avgLatencyMs: number;
  totalCostCents: number;
  totalTokens: number;
}

export interface EvalOutput {
  timestamp: string;
  config: {
    providers: string[];
    judge: string;
    suites: string[];
  };
  results: CaseResult[];
  summary: Record<string, ProviderSummary>;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/eval/types.ts
git commit -m "feat(eval): add eval type definitions"
```

---

### Task 2: defineEval Factory

**Files:**
- Create: `packages/core/src/eval/define-eval.ts`

- [ ] **Step 1: Create the defineEval function**

```typescript
// packages/core/src/eval/define-eval.ts
import type { EvalSuite, EvalSuiteFactory } from './types.js';

export function defineEval(factory: EvalSuiteFactory): EvalSuiteFactory {
  return factory;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/eval/define-eval.ts
git commit -m "feat(eval): add defineEval factory function"
```

---

### Task 3: Scorer

**Files:**
- Create: `packages/core/src/eval/scorer.ts`

- [ ] **Step 1: Create the scorer module**

The scorer takes a `PestResponse` and an `EvalCase`, runs all matchers and rubrics, and returns a `ProviderCaseResult`.

```typescript
// packages/core/src/eval/scorer.ts
import {
  containsToolCall,
  callsToolsInOrder,
  matchesResponseSchema,
  respondsWithinTokens,
  containsText,
  hasToolCallCount,
  satisfiesCriteria,
} from '../matcher-logic.js';
import { resolveJudge } from '../judge-provider.js';
import { estimateCostCents } from '../providers/pricing.js';
import type { PestResponse, Provider } from '../types.js';
import type {
  EvalCase,
  MatcherResultEntry,
  ProviderCaseResult,
  RubricResultEntry,
} from './types.js';

const MATCHER_MAP: Record<
  string,
  (response: PestResponse, ...args: unknown[]) => { pass: boolean }
> = {
  containsToolCall: (r, ...a) =>
    containsToolCall(r, a[0] as string, a[1] as Record<string, unknown> | undefined),
  callsToolsInOrder: (r, ...a) => callsToolsInOrder(r, a[0] as string[]),
  respondsWithinTokens: (r, ...a) => respondsWithinTokens(r, a[0] as number),
  containsText: (r, ...a) => containsText(r, a[0] as string),
  hasToolCallCount: (r, ...a) => hasToolCallCount(r, a[0] as number),
};

export async function scoreCase(
  response: PestResponse,
  evalCase: EvalCase,
  judge?: Provider,
): Promise<Pick<ProviderCaseResult, 'matchers' | 'rubrics' | 'composite'>> {
  const matchers: MatcherResultEntry[] = [];
  const rubrics: RubricResultEntry[] = [];

  // Run deterministic matchers
  if (evalCase.matchers) {
    for (const spec of evalCase.matchers) {
      const fn = MATCHER_MAP[spec.type];
      if (!fn) {
        matchers.push({ type: spec.type, pass: false });
        continue;
      }
      const result = fn(response, ...spec.args);
      matchers.push({ type: spec.type, pass: result.pass });
    }
  }

  // Run rubrics via judge
  if (evalCase.rubrics && evalCase.rubrics.length > 0) {
    const judgeProvider = judge ?? resolveJudge();
    for (const rubric of evalCase.rubrics) {
      const result = await satisfiesCriteria(response, rubric, judgeProvider);
      rubrics.push({
        rubric,
        score: result.score ?? 0,
        reasoning: result.reasoning ?? '',
      });
    }
  }

  // Compute composite
  const matcherPassRate =
    matchers.length > 0
      ? matchers.filter((m) => m.pass).length / matchers.length
      : -1;
  const avgRubricScore =
    rubrics.length > 0
      ? rubrics.reduce((sum, r) => sum + r.score, 0) / rubrics.length
      : -1;

  let composite: number;
  if (matcherPassRate >= 0 && avgRubricScore >= 0) {
    composite = (matcherPassRate + avgRubricScore) / 2;
  } else if (matcherPassRate >= 0) {
    composite = matcherPassRate;
  } else if (avgRubricScore >= 0) {
    composite = avgRubricScore;
  } else {
    composite = 0;
  }

  return { matchers, rubrics, composite };
}

export function buildProviderCaseResult(
  response: PestResponse,
  scored: Pick<ProviderCaseResult, 'matchers' | 'rubrics' | 'composite'>,
): ProviderCaseResult {
  return {
    response: {
      text: response.text,
      toolCalls: response.toolCalls,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      },
      latencyMs: response.latencyMs,
    },
    matchers: scored.matchers,
    rubrics: scored.rubrics,
    composite: scored.composite,
    costCents: estimateCostCents(
      response.model,
      response.usage.inputTokens,
      response.usage.outputTokens,
    ),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/eval/scorer.ts
git commit -m "feat(eval): add scorer module for matchers and rubrics"
```

---

### Task 4: Runner

**Files:**
- Create: `packages/core/src/eval/runner.ts`

- [ ] **Step 1: Create the runner module**

The runner loads config, resolves providers, iterates cases, and calls providers concurrently per case.

```typescript
// packages/core/src/eval/runner.ts
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadConfig } from '../config/loader.js';
import { createProvider } from '../providers/registry.js';
import { setJudge } from '../judge-provider.js';
import { send } from '../send.js';
import { sendAgentic } from '../send-agentic.js';
import type { Provider } from '../types.js';
import type {
  CaseResult,
  EvalCase,
  EvalOutput,
  EvalSuite,
  EvalSuiteFactory,
  ProviderCaseResult,
  ProviderSummary,
} from './types.js';
import { buildProviderCaseResult, scoreCase } from './scorer.js';

export interface RunEvalOptions {
  configFile?: string;
  providerFilter?: string[];
  onCaseStart?: (caseName: string, index: number, total: number) => void;
  onCaseProviderDone?: (
    caseName: string,
    providerName: string,
    result: ProviderCaseResult,
  ) => void;
}

async function loadSuiteFile(filePath: string): Promise<EvalSuiteFactory> {
  const absPath = resolve(filePath);
  const url = pathToFileURL(absPath).href;
  const mod = await import(url);
  const factory = mod.default ?? mod;
  if (typeof factory !== 'function') {
    throw new Error(
      `Eval suite "${filePath}" must export a function (use defineEval). Got ${typeof factory}.`,
    );
  }
  return factory as EvalSuiteFactory;
}

function mergeDefaults(evalCase: EvalCase, suite: EvalSuite): EvalCase {
  if (!suite.defaults) return evalCase;
  const d = suite.defaults;
  return {
    ...evalCase,
    systemPrompt: evalCase.systemPrompt ?? d.systemPrompt,
    tools: evalCase.tools ?? d.tools,
    temperature: evalCase.temperature ?? d.temperature,
    maxTokens: evalCase.maxTokens ?? d.maxTokens,
  };
}

async function executeCase(
  evalCase: EvalCase,
  provider: Provider,
): Promise<ProviderCaseResult> {
  try {
    const message =
      evalCase.messages[evalCase.messages.length - 1]?.role === 'user'
        ? (evalCase.messages[evalCase.messages.length - 1] as { content: string }).content
        : '';

    const options = {
      systemPrompt: evalCase.systemPrompt,
      tools: evalCase.tools,
      temperature: evalCase.temperature,
      maxTokens: evalCase.maxTokens,
    };

    let response;
    if (evalCase.agentic) {
      response = await sendAgentic(provider, message, {
        ...options,
        executor: evalCase.agentic.toolExecutor,
        maxSteps: evalCase.agentic.maxTurns,
      });
    } else {
      response = await send(provider, message, options);
    }

    const scored = await scoreCase(response, evalCase);
    return buildProviderCaseResult(response, scored);
  } catch (err) {
    return {
      response: {
        text: '',
        toolCalls: [],
        usage: { inputTokens: 0, outputTokens: 0 },
        latencyMs: 0,
      },
      matchers: [],
      rubrics: [],
      composite: 0,
      costCents: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function buildSummary(
  results: CaseResult[],
  providerNames: string[],
): Record<string, ProviderSummary> {
  const summary: Record<string, ProviderSummary> = {};

  for (const name of providerNames) {
    const providerResults = results
      .map((r) => r.providers[name])
      .filter((r): r is ProviderCaseResult => r != null && !r.error);

    const totalCases = results.filter((r) => r.providers[name] != null).length;
    const passedCases = providerResults.filter((r) => {
      const allMatchersPass = r.matchers.every((m) => m.pass);
      return allMatchersPass;
    }).length;

    summary[name] = {
      score:
        providerResults.length > 0
          ? providerResults.reduce((s, r) => s + r.composite, 0) / providerResults.length
          : 0,
      passRate: `${passedCases}/${totalCases}`,
      avgLatencyMs:
        providerResults.length > 0
          ? providerResults.reduce((s, r) => s + r.response.latencyMs, 0) /
            providerResults.length
          : 0,
      totalCostCents: providerResults.reduce((s, r) => s + r.costCents, 0),
      totalTokens: providerResults.reduce(
        (s, r) => s + r.response.usage.inputTokens + r.response.usage.outputTokens,
        0,
      ),
    };
  }

  return summary;
}

export async function runEval(
  suiteFiles: string[],
  options?: RunEvalOptions,
): Promise<EvalOutput> {
  const config = await loadConfig(process.cwd(), {
    configFile: options?.configFile,
  });

  const allResults: CaseResult[] = [];
  const allProviderNames: Set<string> = new Set();

  for (const filePath of suiteFiles) {
    const factory = await loadSuiteFile(filePath);
    const suite = await factory();

    // Resolve providers
    const providerNames = options?.providerFilter?.length
      ? suite.providers.filter((p) => options.providerFilter!.includes(p))
      : suite.providers;

    const configProviders = new Map(config.providers.map((p) => [p.name, p]));
    const providers: Provider[] = [];
    for (const name of providerNames) {
      const cfg = configProviders.get(name);
      if (!cfg) {
        throw new Error(
          `Provider "${name}" not found in pest.config. Available: ${config.providers.map((p) => p.name).join(', ')}`,
        );
      }
      providers.push(createProvider(cfg));
      allProviderNames.add(name);
    }

    // Set up judge
    if (suite.judge || config.judge) {
      const judgeName = suite.judge ?? config.judge?.provider;
      if (judgeName) {
        const judgeCfg = configProviders.get(judgeName);
        if (judgeCfg) {
          setJudge(createProvider(judgeCfg));
        }
      }
    }

    // Execute cases
    for (let i = 0; i < suite.cases.length; i++) {
      const evalCase = mergeDefaults(suite.cases[i], suite);
      options?.onCaseStart?.(evalCase.name, i, suite.cases.length);

      // Run all providers concurrently for this case
      const providerResults = await Promise.all(
        providers.map((provider) => executeCase(evalCase, provider)),
      );

      const caseResult: CaseResult = {
        case: evalCase.name,
        suite: filePath,
        providers: {},
      };

      for (let j = 0; j < providers.length; j++) {
        const result = providerResults[j];
        caseResult.providers[providerNames[j]] = result;
        options?.onCaseProviderDone?.(evalCase.name, providerNames[j], result);
      }

      allResults.push(caseResult);
    }
  }

  const providerNames = [...allProviderNames];

  return {
    timestamp: new Date().toISOString(),
    config: {
      providers: providerNames,
      judge: config.judge?.provider ?? '',
      suites: suiteFiles,
    },
    results: allResults,
    summary: buildSummary(allResults, providerNames),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/eval/runner.ts
git commit -m "feat(eval): add eval runner with parallel provider execution"
```

---

### Task 5: CLI Report (Terminal Output)

**Files:**
- Create: `packages/core/src/eval/report-cli.ts`

- [ ] **Step 1: Create the CLI reporter**

```typescript
// packages/core/src/eval/report-cli.ts
import { ansi as c, formatCost, formatDuration } from '../format.js';
import type { EvalOutput, ProviderCaseResult } from './types.js';

export function printCaseProgress(
  caseName: string,
  index: number,
  total: number,
): void {
  console.log(`\n  ${c.dim}[${index + 1}/${total}]${c.reset} ${caseName}`);
}

export function printProviderResult(
  providerName: string,
  result: ProviderCaseResult,
): void {
  if (result.error) {
    console.log(
      `    ${c.red}${providerName}${c.reset}  ${c.red}error: ${result.error}${c.reset}`,
    );
    return;
  }

  const score = result.composite.toFixed(2);
  const latency = formatDuration(result.response.latencyMs);
  const cost = formatCost(result.costCents);
  console.log(
    `    ${c.dim}${providerName}${c.reset}  ${score}  ${c.dim}${latency}${c.reset}  ${c.dim}${cost}${c.reset}`,
  );
}

export function printSummary(output: EvalOutput): void {
  const totalCases = output.results.length;
  const suiteNames = output.config.suites.join(', ');

  console.log(
    `\n  ${c.bold}pest eval${c.reset} ${c.dim}${suiteNames} (${totalCases} cases, ${output.config.providers.length} providers)${c.reset}\n`,
  );

  // Header
  console.log(
    `  ${'Provider'.padEnd(20)} ${'Score'.padEnd(8)} ${'Pass'.padEnd(8)} ${'Latency'.padEnd(12)} ${'Cost'.padEnd(10)}`,
  );
  console.log(`  ${'-'.repeat(58)}`);

  // Rows
  for (const [name, s] of Object.entries(output.summary)) {
    const score = s.score.toFixed(2);
    const latency = formatDuration(s.avgLatencyMs) + ' avg';
    const cost = formatCost(s.totalCostCents);
    console.log(
      `  ${name.padEnd(20)} ${score.padEnd(8)} ${s.passRate.padEnd(8)} ${latency.padEnd(12)} ${cost.padEnd(10)}`,
    );
  }

  console.log('');
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/eval/report-cli.ts
git commit -m "feat(eval): add terminal table output for eval results"
```

---

### Task 6: JSON Report

**Files:**
- Create: `packages/core/src/eval/report-json.ts`

- [ ] **Step 1: Create the JSON reporter**

```typescript
// packages/core/src/eval/report-json.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { EvalOutput } from './types.js';

export function writeEvalJson(output: EvalOutput, filePath: string): void {
  const absPath = resolve(process.cwd(), filePath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, JSON.stringify(output, null, 2));
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/eval/report-json.ts
git commit -m "feat(eval): add JSON report writer"
```

---

### Task 7: HTML Comparison Report

**Files:**
- Create: `packages/core/src/eval/report-html.ts`

- [ ] **Step 1: Create the HTML report generator**

This is the biggest file. It generates a self-contained HTML page with tabbed provider views per case and a summary table at the bottom.

```typescript
// packages/core/src/eval/report-html.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  escapeHtml,
  formatCost,
  formatDuration,
  formatTokens,
} from '../format.js';
import type { EvalOutput, ProviderCaseResult } from './types.js';

function renderProviderTab(
  providerName: string,
  result: ProviderCaseResult,
): string {
  if (result.error) {
    return `<div class="tab-content"><div class="error-msg">Error: ${escapeHtml(result.error)}</div></div>`;
  }

  const r = result.response;

  const toolCallsHtml =
    r.toolCalls.length > 0
      ? `<div class="tool-calls"><h5>Tool Calls</h5>${r.toolCalls
          .map(
            (tc) =>
              `<div class="tool-call"><span class="tool-name">${escapeHtml(tc.name)}</span><code>${escapeHtml(JSON.stringify(tc.args))}</code></div>`,
          )
          .join('')}</div>`
      : '';

  const matchersHtml =
    result.matchers.length > 0
      ? `<div class="eval-matchers"><h5>Matchers</h5>${result.matchers
          .map((m) => {
            const icon = m.pass ? '&#10003;' : '&#10007;';
            const cls = m.pass ? 'pass' : 'fail';
            return `<div class="matcher ${cls}"><span class="matcher-icon">${icon}</span> <code>${escapeHtml(m.type)}</code></div>`;
          })
          .join('')}</div>`
      : '';

  const rubricsHtml =
    result.rubrics.length > 0
      ? `<div class="eval-rubrics"><h5>Rubrics</h5>${result.rubrics
          .map(
            (rb) =>
              `<div class="rubric"><span class="rubric-score">${rb.score.toFixed(2)}</span> <span class="rubric-text">${escapeHtml(rb.rubric)}</span><div class="rubric-reasoning">${escapeHtml(rb.reasoning)}</div></div>`,
          )
          .join('')}</div>`
      : '';

  const metaHtml = `<div class="provider-meta">${formatDuration(r.latencyMs)} &middot; ${formatTokens(r.usage.inputTokens)}&rarr;${formatTokens(r.usage.outputTokens)} tok &middot; ${formatCost(result.costCents)}</div>`;

  return `<div class="tab-content">
    <div class="response-text"><pre>${escapeHtml(r.text || '(no text — tool calls only)')}</pre></div>
    ${toolCallsHtml}
    ${matchersHtml}
    ${rubricsHtml}
    ${metaHtml}
  </div>`;
}

function renderCase(
  caseName: string,
  providers: Record<string, ProviderCaseResult>,
  caseIndex: number,
): string {
  const providerNames = Object.keys(providers);
  if (providerNames.length === 0) return '';

  const tabButtons = providerNames
    .map(
      (name, i) =>
        `<button class="tab-btn${i === 0 ? ' active' : ''}" onclick="switchTab(this, 'case-${caseIndex}', '${name}')">${escapeHtml(name)}</button>`,
    )
    .join('');

  const tabPanels = providerNames
    .map(
      (name, i) =>
        `<div class="tab-panel${i === 0 ? ' active' : ''}" data-case="case-${caseIndex}" data-provider="${name}">${renderProviderTab(name, providers[name])}</div>`,
    )
    .join('');

  return `
    <div class="eval-case">
      <h3>${escapeHtml(caseName)}</h3>
      <div class="tab-bar">${tabButtons}</div>
      <div class="tab-panels">${tabPanels}</div>
    </div>`;
}

function renderSummaryTable(output: EvalOutput): string {
  const headerCells = ['Provider', 'Score', 'Pass Rate', 'Avg Latency', 'Total Cost', 'Total Tokens']
    .map((h) => `<th>${h}</th>`)
    .join('');

  const rows = Object.entries(output.summary)
    .map(
      ([name, s]) =>
        `<tr><td>${escapeHtml(name)}</td><td>${s.score.toFixed(2)}</td><td>${s.passRate}</td><td>${formatDuration(s.avgLatencyMs)}</td><td>${formatCost(s.totalCostCents)}</td><td>${formatTokens(s.totalTokens)}</td></tr>`,
    )
    .join('');

  return `<table class="summary-table"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function buildEvalHtmlReport(output: EvalOutput): string {
  const casesHtml = output.results
    .map((r, i) => renderCase(r.case, r.providers, i))
    .join('');

  const summaryHtml = renderSummaryTable(output);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>pest eval report — ${escapeHtml(output.timestamp)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0d1117; color: #c9d1d9; line-height: 1.5; }
  .container { max-width: 1100px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; color: #f0f6fc; }
  h1 span { color: #58a6ff; }
  .timestamp { color: #8b949e; font-size: 14px; margin-bottom: 24px; }
  h3 { font-size: 16px; margin-bottom: 12px; color: #f0f6fc; }
  h5 { font-size: 12px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; margin-top: 12px; }
  .eval-case { background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin-bottom: 16px; padding: 16px; }
  .tab-bar { display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
  .tab-btn { background: none; border: 1px solid transparent; border-radius: 6px 6px 0 0; color: #8b949e; cursor: pointer; font-size: 13px; padding: 6px 14px; font-family: inherit; }
  .tab-btn:hover { color: #c9d1d9; background: #1c2128; }
  .tab-btn.active { color: #58a6ff; border-color: #30363d; border-bottom-color: #0d1117; background: #0d1117; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }
  .response-text { margin-bottom: 12px; }
  .response-text pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 14px; line-height: 1.6; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 12px; }
  .tool-calls { margin-bottom: 8px; }
  .tool-call { font-size: 13px; padding: 6px 10px; background: #1c1f26; border-radius: 4px; margin-bottom: 4px; display: flex; gap: 8px; align-items: center; }
  .tool-name { color: #d2a8ff; font-weight: 600; }
  .tool-call code { color: #8b949e; font-size: 12px; }
  .matcher { font-size: 13px; padding: 4px 8px; margin-bottom: 3px; border-radius: 4px; display: flex; align-items: center; gap: 6px; }
  .matcher.pass { background: #1a2b1a; }
  .matcher.fail { background: #2b1a1a; }
  .matcher.pass .matcher-icon { color: #3fb950; }
  .matcher.fail .matcher-icon { color: #f85149; }
  .matcher code { color: #d2a8ff; }
  .rubric { font-size: 13px; padding: 6px 8px; margin-bottom: 4px; background: #1c1f26; border-radius: 4px; }
  .rubric-score { color: #e3b341; font-weight: 600; margin-right: 6px; }
  .rubric-text { color: #c9d1d9; }
  .rubric-reasoning { color: #8b949e; font-size: 12px; font-style: italic; margin-top: 2px; }
  .provider-meta { font-size: 12px; color: #8b949e; margin-top: 12px; padding-top: 8px; border-top: 1px solid #30363d; }
  .error-msg { color: #f85149; font-size: 14px; padding: 12px; background: #2b1a1a; border-radius: 6px; }
  .summary-section { margin-top: 32px; }
  .summary-section h2 { font-size: 18px; margin-bottom: 12px; color: #f0f6fc; }
  .summary-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .summary-table th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #30363d; color: #8b949e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; }
  .summary-table th:hover { color: #c9d1d9; }
  .summary-table td { padding: 10px 12px; border-bottom: 1px solid #21262d; }
  .summary-table tr:hover td { background: #1c2128; }
</style>
</head>
<body>
<div class="container">
  <h1><span>pest</span> eval report</h1>
  <div class="timestamp">${escapeHtml(output.timestamp)} &middot; ${output.results.length} cases &middot; ${output.config.providers.length} providers</div>
  ${casesHtml}
  <div class="summary-section">
    <h2>Summary</h2>
    ${summaryHtml}
  </div>
</div>
<script>
function switchTab(btn, caseId, provider) {
  const parent = btn.closest('.eval-case');
  parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  parent.querySelector('.tab-panel[data-case="' + caseId + '"][data-provider="' + provider + '"]').classList.add('active');
}

// Sortable table
document.querySelectorAll('.summary-table th').forEach((th, colIdx) => {
  th.addEventListener('click', () => {
    const table = th.closest('table');
    const tbody = table.querySelector('tbody');
    const rows = [...tbody.querySelectorAll('tr')];
    const dir = th.dataset.sort === 'asc' ? 'desc' : 'asc';
    th.dataset.sort = dir;
    rows.sort((a, b) => {
      const aVal = a.children[colIdx].textContent;
      const bVal = b.children[colIdx].textContent;
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) return dir === 'asc' ? aNum - bNum : bNum - aNum;
      return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    rows.forEach(r => tbody.appendChild(r));
  });
});
</script>
</body>
</html>`;
}

export function writeEvalHtml(output: EvalOutput, filePath: string): void {
  const absPath = resolve(process.cwd(), filePath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, buildEvalHtmlReport(output));
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/eval/report-html.ts
git commit -m "feat(eval): add HTML comparison report with tabbed provider view"
```

---

### Task 8: Eval Module Index + Core Exports

**Files:**
- Create: `packages/core/src/eval/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Create the eval module index**

```typescript
// packages/core/src/eval/index.ts
export { defineEval } from './define-eval.js';
export { runEval } from './runner.js';
export type { RunEvalOptions } from './runner.js';
export { buildEvalHtmlReport, writeEvalHtml } from './report-html.js';
export { writeEvalJson } from './report-json.js';
export { printCaseProgress, printProviderResult, printSummary } from './report-cli.js';
export type {
  CaseResult,
  EvalCase,
  EvalCaseDefaults,
  EvalOutput,
  EvalSuite,
  EvalSuiteFactory,
  MatcherResultEntry,
  MatcherSpec,
  ProviderCaseResult,
  ProviderSummary,
  RubricResultEntry,
} from './types.js';
```

- [ ] **Step 2: Add eval exports to core index.ts**

Add the following to `packages/core/src/index.ts` after the existing exports:

```typescript
// Eval
export {
  defineEval,
  runEval,
  buildEvalHtmlReport,
  writeEvalHtml,
  writeEvalJson,
  printCaseProgress,
  printProviderResult,
  printSummary,
} from './eval/index.js';
export type {
  RunEvalOptions,
  CaseResult,
  EvalCase,
  EvalCaseDefaults,
  EvalOutput,
  EvalSuite,
  EvalSuiteFactory,
  MatcherResultEntry,
  MatcherSpec,
  ProviderCaseResult,
  ProviderSummary,
  RubricResultEntry,
} from './eval/index.js';
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/eval/index.ts packages/core/src/index.ts
git commit -m "feat(eval): export eval module from core"
```

---

### Task 9: CLI Eval Command

**Files:**
- Create: `packages/cli/src/commands/eval.ts`
- Modify: `packages/cli/src/cli.ts`

- [ ] **Step 1: Create the eval CLI command**

```typescript
// packages/cli/src/commands/eval.ts
import { defineCommand } from 'citty';
import { resolve } from 'node:path';
import { readdirSync, statSync } from 'node:fs';

function discoverEvalFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const full = resolve(dir, entry);
    const stat = statSync(full, { throwIfNoEntry: false });
    if (!stat) continue;
    if (stat.isDirectory()) {
      results.push(...discoverEvalFiles(full));
    } else if (entry.endsWith('.eval.ts') || entry.endsWith('.eval.js')) {
      results.push(full);
    }
  }
  return results;
}

export const evalCommand = defineCommand({
  meta: { description: 'Run multi-model evaluation suites' },
  args: {
    files: {
      type: 'positional',
      description: 'Eval suite files (default: **/*.eval.ts)',
      required: false,
    },
    provider: {
      type: 'string',
      alias: 'p',
      description: 'Filter to specific provider(s), comma-separated',
    },
    json: {
      type: 'string',
      description: 'Write JSON results to path',
    },
    html: {
      type: 'string',
      description: 'Write HTML report to path',
    },
    config: {
      type: 'string',
      alias: 'c',
      description: 'Path to pest config file',
    },
    verbose: {
      type: 'boolean',
      alias: 'v',
      description: 'Show detailed output during execution',
    },
  },
  async run({ args }) {
    const {
      runEval,
      printCaseProgress,
      printProviderResult,
      printSummary,
      writeEvalJson,
      writeEvalHtml,
    } = await import('@heilgar/pest-core');

    // Discover eval files
    let suiteFiles: string[];
    if (args.files) {
      suiteFiles = [resolve(args.files)];
    } else {
      suiteFiles = discoverEvalFiles(process.cwd()).sort();
      if (suiteFiles.length === 0) {
        console.error(
          '\n  No eval suites found. Create a *.eval.ts file or specify a path.\n',
        );
        process.exit(1);
      }
    }

    const providerFilter = args.provider
      ? args.provider.split(',').map((s: string) => s.trim())
      : undefined;

    console.log(`\n  pest eval — ${suiteFiles.length} suite(s)\n`);

    const output = await runEval(suiteFiles, {
      configFile: args.config,
      providerFilter,
      onCaseStart: (name, idx, total) => {
        printCaseProgress(name, idx, total);
      },
      onCaseProviderDone: (_name, providerName, result) => {
        printProviderResult(providerName, result);
      },
    });

    // Print summary table
    printSummary(output);

    // Write reports
    if (args.json) {
      writeEvalJson(output, args.json);
      console.log(`  JSON report written to ${args.json}`);
    }

    if (args.html) {
      writeEvalHtml(output, args.html);
      console.log(`  HTML report written to ${args.html}`);
    }

    if (args.json || args.html) {
      console.log('');
    }

    // Exit with non-zero if any provider scored below 0.5
    const allScores = Object.values(output.summary).map((s) => s.score);
    if (allScores.some((s) => s < 0.5)) {
      process.exit(1);
    }
  },
});
```

- [ ] **Step 2: Register the eval command in cli.ts**

Add the import at the top of `packages/cli/src/cli.ts`:

```typescript
import { evalCommand } from './commands/eval.js';
```

Add to the `subCommands` object:

```typescript
subCommands: {
  install: installCommand,
  qa: qaCommand,
  exec: execCommand,
  eval: evalCommand,
},
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/commands/eval.ts packages/cli/src/cli.ts
git commit -m "feat(cli): add pest eval command"
```

---

### Task 10: Build and Verify

- [ ] **Step 1: Build core package**

Run: `pnpm --filter @heilgar/pest-core build`
Expected: Clean build with no errors.

- [ ] **Step 2: Build CLI package**

Run: `pnpm --filter @heilgar/pest-cli build`
Expected: Clean build with no errors.

- [ ] **Step 3: Fix any TypeScript errors**

If there are import resolution issues or type errors, fix them and re-build.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(eval): resolve build issues"
```

---

### Task 11: Update CLI Docs

**Files:**
- Modify: `docs/reference/cli.md`

- [ ] **Step 1: Add eval command documentation to cli.md**

Add the following section after the `### pest qa --mcp <server>` section:

```markdown
### `pest eval [files...]`

Run multi-model evaluation suites. Discovers `*.eval.ts` files and runs each case against configured providers, producing comparison results.

```bash
pest eval
pest eval ./eval/customer-support.eval.ts
pest eval --provider gpt4o,claude-sonnet
pest eval --html eval-report.html --json eval-results.json
```

| Option | Alias | Description |
|---|---|---|
| `files` | | Eval suite file path (default: discovers all `*.eval.ts`) |
| `--provider` | `-p` | Filter to specific provider(s), comma-separated |
| `--json` | | Write JSON results to path |
| `--html` | | Write HTML comparison report to path |
| `--config` | `-c` | Path to pest config file (default: auto-detected) |
| `--verbose` | `-v` | Show detailed output |

Example output:

```
pest eval - customer-support (5 cases, 3 providers)

  Provider             Score    Pass     Latency      Cost
  ----------------------------------------------------------
  gpt4o                0.87     9/10     1.2s avg     $0.0300
  claude-sonnet        0.92     10/10    1.8s avg     $0.0400
  gemini-flash         0.81     8/10     0.6s avg     $0.0100
```

The command returns exit code 1 if any provider scores below 0.5, making it suitable for CI pipelines.

See [Multi-Model Eval](/guide/eval) for the full guide on writing eval suites.
```

- [ ] **Step 2: Commit**

```bash
git add docs/reference/cli.md
git commit -m "docs: add pest eval command reference"
```

---

### Task 12: Update llms.md

**Files:**
- Modify: `docs/llms.md`

- [ ] **Step 1: Read the current llms.md to understand its structure**

Read the file and add eval-related content in the appropriate section, following the existing format.

- [ ] **Step 2: Add eval content**

Add a section about multi-model evaluation covering: `defineEval`, `pest eval` CLI, eval suite format, and output options.

- [ ] **Step 3: Commit**

```bash
git add docs/llms.md
git commit -m "docs: add eval content to llms.md"
```
