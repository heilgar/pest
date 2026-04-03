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

  console.log(
    `  ${'Provider'.padEnd(20)} ${'Score'.padEnd(8)} ${'Pass'.padEnd(8)} ${'Latency'.padEnd(12)} ${'Cost'.padEnd(10)}`,
  );
  console.log(`  ${'-'.repeat(58)}`);

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
