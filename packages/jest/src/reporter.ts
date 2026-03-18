import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  emptyStats,
  finishReport,
  type LogEntry,
  processTestResult,
  type ReporterOptions,
  type RunStats,
  type TestData,
} from '@heilgar/pest-core';

export type { ReporterOptions as PestJestReporterOptions };

const PEST_DATA_DIR = resolve(
  process.cwd(),
  'node_modules',
  '.cache',
  'pest-jest',
);

export default class PestJestReporter {
  private options: ReporterOptions;
  private testStatuses = new Map<string, string>();

  constructor(_globalConfig: unknown, options?: ReporterOptions) {
    this.options = {
      showCost: true,
      logFile: 'pest-log.json',
      htmlFile: 'pest-report.html',
      ...options,
    };
  }

  onTestResult(
    _test: unknown,
    testResult: { testResults: Array<{ fullName: string; status: string }> },
  ): void {
    for (const result of testResult.testResults) {
      this.testStatuses.set(result.fullName, result.status);
    }
  }

  onRunComplete(): void {
    const allData = this.readWorkerData();
    if (allData.size === 0) return;

    const stats: RunStats = emptyStats();
    const logEntries: LogEntry[] = [];

    for (const [, pestData] of allData) {
      if (pestData.entries.length === 0 && pestData.sends.length === 0)
        continue;

      const testName = pestData.testName ?? pestData.testId;
      const jestStatus = this.testStatuses.get(testName);
      const allPassed = jestStatus
        ? jestStatus === 'passed'
        : pestData.entries.every((e) => e.pass);

      const entry = processTestResult(
        {
          name: testName,
          status: allPassed ? 'passed' : 'failed',
          sends: pestData.sends,
          entries: pestData.entries,
        },
        stats,
        this.options,
      );
      logEntries.push(entry);
    }

    finishReport(stats, logEntries, this.options);
  }

  private readWorkerData(): Map<string, TestData> {
    const allData = new Map<string, TestData>();

    if (!existsSync(PEST_DATA_DIR)) return allData;

    try {
      const files = readdirSync(PEST_DATA_DIR).filter((f) =>
        f.endsWith('.json'),
      );
      for (const file of files) {
        const content = readFileSync(resolve(PEST_DATA_DIR, file), 'utf-8');
        const data = JSON.parse(content) as Record<string, TestData>;
        for (const [id, testData] of Object.entries(data)) {
          allData.set(id, testData);
        }
      }
      rmSync(PEST_DATA_DIR, { recursive: true, force: true });
    } catch {
      // Ignore — data may not exist if no pest tests ran
    }

    return allData;
  }
}
