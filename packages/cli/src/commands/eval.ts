import { defineCommand } from 'citty';
import { resolve } from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import {
  runEval,
  printCaseProgress,
  printProviderResult,
  printSummary,
  writeEvalJson,
  writeEvalHtml,
} from '@heilgar/pest-core';
import type { ProviderCaseResult } from '@heilgar/pest-core';

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

    console.log(`\n  pest eval - ${suiteFiles.length} suite(s)\n`);

    const output = await runEval(suiteFiles, {
      configFile: args.config,
      providerFilter,
      onCaseStart: (name: string, idx: number, total: number) => {
        printCaseProgress(name, idx, total);
      },
      onCaseProviderDone: (_name: string, providerName: string, result: ProviderCaseResult) => {
        printProviderResult(providerName, result);
      },
    });

    printSummary(output);

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
