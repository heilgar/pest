import {
  containsToolCall,
  callsToolsInOrder,
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
    const judgeProvider = resolveJudge({ judge });
    for (const rubric of evalCase.rubrics) {
      const result = await satisfiesCriteria(response, rubric, judgeProvider);
      rubrics.push({
        rubric,
        score: result.score ?? 0,
        reasoning: result.reasoning ?? '',
      });
    }
  }

  // Compute composite score: -1 sentinel means "no data for this dimension"
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
