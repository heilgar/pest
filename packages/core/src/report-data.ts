import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { SendEntry } from './accumulator.js';
import {
  ansi as c,
  formatCost,
  formatDuration,
  formatTokens,
} from './format.js';
import { estimateCostCents } from './providers/pricing.js';
import { buildHtmlReport } from './report-html.js';

export interface ReporterOptions {
  verbose?: boolean;
  showCost?: boolean;
  logFile?: string | false;
  htmlFile?: string | false;
}

export interface RunStats {
  tests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalLatencyMs: number;
  totalCostCents: number;
  judgeCount: number;
  toolCallCount: number;
}

export interface LogEntry {
  test: string;
  status: string;
  sends: SendEntry[];
  matchers: Array<{
    matcher: string;
    pass: boolean;
    score?: number;
    reasoning?: string;
    judgeModel?: string;
  }>;
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | string;
  sends: SendEntry[];
  entries: Array<{
    matcher: string;
    pass: boolean;
    score?: number;
    reasoning?: string;
    judgeModel?: string;
    response?: {
      provider: string;
      model: string;
      latencyMs: number;
      usage: { inputTokens: number; outputTokens: number };
      toolCalls: Array<{ name: string }>;
      text: string;
    };
  }>;
}

const silent = process.env.PEST_SILENT === '1';
function log(...args: unknown[]): void {
  if (!silent) console.log(...args);
}

export function emptyStats(): RunStats {
  return {
    tests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalLatencyMs: 0,
    totalCostCents: 0,
    judgeCount: 0,
    toolCallCount: 0,
  };
}

/** Process a single test result and update stats. Returns a LogEntry. */
export function processTestResult(
  testResult: TestResult,
  stats: RunStats,
  options: ReporterOptions,
): LogEntry {
  stats.tests++;
  const { entries, sends } = testResult;

  const inputTokens = sends.reduce((sum, s) => sum + s.usage.inputTokens, 0);
  const outputTokens = sends.reduce((sum, s) => sum + s.usage.outputTokens, 0);
  const latencyMs = sends.reduce((sum, s) => sum + s.latencyMs, 0);
  const toolCalls = sends.reduce((sum, s) => sum + s.toolCalls.length, 0);
  const model = sends[0]?.model ?? '';
  const provider = sends[0]?.provider ?? '';

  let costCents = 0;
  if (model) {
    costCents = estimateCostCents(model, inputTokens, outputTokens);
  }

  stats.totalInputTokens += inputTokens;
  stats.totalOutputTokens += outputTokens;
  stats.totalLatencyMs += latencyMs;
  stats.totalCostCents += costCents;
  stats.toolCallCount += toolCalls;

  // Console output
  const statusIcon =
    testResult.status === 'passed'
      ? `${c.green}\u2713${c.reset}`
      : `${c.red}\u2717${c.reset}`;

  const parts: string[] = [];
  if (provider) parts.push(`${c.dim}${provider}${c.reset}`);
  parts.push(`${c.dim}${formatDuration(latencyMs)}${c.reset}`);
  parts.push(
    `${c.cyan}${formatTokens(inputTokens)}\u2192${formatTokens(outputTokens)} tok${c.reset}`,
  );
  if (options.showCost && costCents > 0) {
    parts.push(`${c.dim}${formatCost(costCents)}${c.reset}`);
  }
  if (toolCalls > 0) {
    const toolNames = [
      ...new Set(sends.flatMap((s) => s.toolCalls.map((tc) => tc.name))),
    ];
    parts.push(`${c.magenta}${toolNames.join(', ')}${c.reset}`);
  }

  log(
    `  ${c.dim}pest${c.reset} ${statusIcon} ${testResult.name} \u2502 ${parts.join(' \u2502 ')}`,
  );

  // Judge details
  const judgeEntries = entries.filter((e) => e.judgeModel);
  if (judgeEntries.length > 0) {
    stats.judgeCount += judgeEntries.length;
    for (const entry of judgeEntries) {
      const scoreStr = entry.score != null ? ` score ${entry.score}` : '';
      const icon = entry.pass
        ? `${c.green}\u2713${c.reset}`
        : `${c.red}\u2717${c.reset}`;
      const reasoning =
        options.verbose && entry.reasoning
          ? ` ${c.dim}"${entry.reasoning}"${c.reset}`
          : '';
      log(
        `       ${icon} ${c.dim}${entry.matcher}${c.reset}${scoreStr}${reasoning}`,
      );
    }
  }

  return {
    test: testResult.name,
    status: testResult.status,
    sends,
    matchers: entries.map((e) => ({
      matcher: e.matcher,
      pass: e.pass,
      score: e.score,
      reasoning: e.reasoning,
      judgeModel: e.judgeModel,
    })),
  };
}

/** Print summary and write log/HTML files. */
export function finishReport(
  stats: RunStats,
  logEntries: LogEntry[],
  options: ReporterOptions,
): void {
  if (stats.tests === 0) return;

  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;

  const parts: string[] = [
    `${stats.tests} tests`,
    `${formatTokens(totalTokens)} tokens ${c.dim}(${formatTokens(stats.totalInputTokens)}\u2192${formatTokens(stats.totalOutputTokens)})${c.reset}`,
  ];

  if (options.showCost && stats.totalCostCents > 0) {
    parts.push(formatCost(stats.totalCostCents));
  }
  if (stats.judgeCount > 0) {
    parts.push(`${stats.judgeCount} judge calls`);
  }
  if (stats.toolCallCount > 0) {
    parts.push(`${stats.toolCallCount} tool calls`);
  }

  log('');
  log(`  ${c.bold}pest${c.reset} ${parts.join(`${c.dim} \u2502 ${c.reset}`)}`);
  log('');

  const reportPayload = {
    timestamp: new Date().toISOString(),
    summary: {
      tests: stats.tests,
      totalTokens,
      inputTokens: stats.totalInputTokens,
      outputTokens: stats.totalOutputTokens,
      estimatedCost: formatCost(stats.totalCostCents),
      judgeCount: stats.judgeCount,
      toolCallCount: stats.toolCallCount,
    },
    tests: logEntries,
  };

  // Write log file
  const logFile = process.env.PEST_LOG_FILE ?? options.logFile;
  if (logFile && logEntries.length > 0) {
    const logPath = resolve(process.cwd(), logFile);
    mkdirSync(dirname(logPath), { recursive: true });
    writeFileSync(logPath, JSON.stringify(reportPayload, null, 2));
    log(`  ${c.dim}pest log written to ${logFile}${c.reset}`);
  }

  // Write HTML report
  if (options.htmlFile && logEntries.length > 0) {
    const htmlPath = resolve(process.cwd(), options.htmlFile);
    mkdirSync(dirname(htmlPath), { recursive: true });
    writeFileSync(htmlPath, buildHtmlReport(reportPayload));
    log(`  ${c.dim}pest report written to ${options.htmlFile}${c.reset}`);
  }

  log('');
}
