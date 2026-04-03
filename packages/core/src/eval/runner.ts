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
    const lastMessage = evalCase.messages[evalCase.messages.length - 1];
    const message =
      lastMessage?.role === 'user'
        ? (lastMessage as { content: string }).content
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
    const passedCases = providerResults.filter((r) =>
      r.matchers.every((m) => m.pass),
    ).length;

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

    // Execute cases sequentially, providers in parallel per case
    for (let i = 0; i < suite.cases.length; i++) {
      const rawCase = suite.cases[i];
      if (!rawCase) continue;
      const evalCase = mergeDefaults(rawCase, suite);
      options?.onCaseStart?.(evalCase.name, i, suite.cases.length);

      const providerResults = await Promise.all(
        providers.map((provider) => executeCase(evalCase, provider)),
      );

      const caseResult: CaseResult = {
        case: evalCase.name,
        suite: filePath,
        providers: {},
      };

      for (let j = 0; j < providers.length; j++) {
        const name = providerNames[j];
        const result = providerResults[j];
        if (!name || !result) continue;
        caseResult.providers[name] = result;
        options?.onCaseProviderDone?.(evalCase.name, name, result);
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
