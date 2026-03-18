import {
  emptyStats,
  finishReport,
  type LogEntry,
  processTestResult,
  type ReporterOptions,
  type RunStats,
  type TestData,
} from '@heilgar/pest-core';
import type { Reporter, TestCase, TestModule } from 'vitest/node';

export type { ReporterOptions as PestReporterOptions };

export default class PestReporter implements Reporter {
  private options: ReporterOptions;
  private stats: RunStats = emptyStats();
  private log: LogEntry[] = [];

  constructor(options?: ReporterOptions) {
    this.options = {
      showCost: true,
      logFile: 'pest-log.json',
      htmlFile: 'pest-report.html',
      ...options,
    };
  }

  onTestCaseResult(testCase: TestCase): void {
    const meta = testCase.meta() as Record<string, unknown>;
    const pestData = meta.pest as TestData | undefined;
    if (
      !pestData ||
      (pestData.entries.length === 0 && pestData.sends.length === 0)
    )
      return;

    const entry = processTestResult(
      {
        name: testCase.fullName,
        status: testCase.result().state === 'passed' ? 'passed' : 'failed',
        sends: pestData.sends,
        entries: pestData.entries,
      },
      this.stats,
      this.options,
    );
    this.log.push(entry);
  }

  onTestRunEnd(_testModules: ReadonlyArray<TestModule>): void {
    finishReport(this.stats, this.log, this.options);
  }
}
