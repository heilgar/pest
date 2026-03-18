import { buildMatcherEntry, record } from './accumulator.js';
import { resolveJudge } from './judge-provider.js';
import type {
  ClassificationOptions,
  MatcherResult,
  RubricConfig,
  SemanticOptions,
} from './matcher-logic.js';
import {
  callsToolsInOrder,
  classifiedAs,
  containsText,
  containsToolCall,
  doesNotDisclose,
  hasToolCallCount,
  matchesResponseSchema,
  matchesSemanticMeaning,
  respondsWithinTokens,
  satisfiesCriteria,
} from './matcher-logic.js';
import type { PestResponse, Provider } from './types.js';

type TestIdResolver = () => string | undefined;

function createRecordResult(getTestId: TestIdResolver) {
  return (
    matcher: string,
    result: MatcherResult,
    received: PestResponse,
    judgeModel?: string,
  ): void => {
    const testId = getTestId();
    if (testId) {
      record(testId, buildMatcherEntry(matcher, result, received, judgeModel));
    }
  };
}

/**
 * Create pest matchers bound to a test-id resolver.
 * Shared by vitest and jest extensions to avoid code duplication.
 */
export function createPestMatchers(getTestId: TestIdResolver) {
  const recordResult = createRecordResult(getTestId);

  return {
    // --- Deterministic ---

    toContainToolCall(
      received: PestResponse,
      name: string,
      args?: Record<string, unknown>,
    ) {
      const result = containsToolCall(received, name, args);
      recordResult('toContainToolCall', result, received);
      return { pass: result.pass, message: () => result.message };
    },

    toCallToolsInOrder(received: PestResponse, names: string[]) {
      const result = callsToolsInOrder(received, names);
      recordResult('toCallToolsInOrder', result, received);
      return { pass: result.pass, message: () => result.message };
    },

    toMatchResponseSchema(received: PestResponse, schema: unknown) {
      const result = matchesResponseSchema(
        received,
        schema as Parameters<typeof matchesResponseSchema>[1],
      );
      recordResult('toMatchResponseSchema', result, received);
      return { pass: result.pass, message: () => result.message };
    },

    toRespondWithinTokens(received: PestResponse, maxTokens: number) {
      const result = respondsWithinTokens(received, maxTokens);
      recordResult('toRespondWithinTokens', result, received);
      return { pass: result.pass, message: () => result.message };
    },

    toContainText(received: PestResponse, text: string) {
      const result = containsText(received, text);
      recordResult('toContainText', result, received);
      return { pass: result.pass, message: () => result.message };
    },

    toNotContainText(received: PestResponse, text: string) {
      const result = containsText(received, text);
      const inverted = { ...result, pass: !result.pass };
      recordResult('toNotContainText', inverted, received);
      return {
        pass: !result.pass,
        message: () =>
          result.pass
            ? `Expected response NOT to contain "${text}", but it does.`
            : `Expected response to contain "${text}", but it doesn't.`,
      };
    },

    toHaveToolCallCount(received: PestResponse, count: number) {
      const result = hasToolCallCount(received, count);
      recordResult('toHaveToolCallCount', result, received);
      return { pass: result.pass, message: () => result.message };
    },

    // --- LLM-judged ---

    async toMatchSemanticMeaning(
      received: PestResponse,
      expected: string,
      options?: SemanticOptions,
    ) {
      const judge = resolveJudge(options);
      const result = await matchesSemanticMeaning(
        received,
        expected,
        judge,
        options,
      );
      recordResult('toMatchSemanticMeaning', result, received, judge.model);
      return { pass: result.pass, message: () => result.message };
    },

    async toSatisfyCriteria(
      received: PestResponse,
      rubric: string | RubricConfig,
      options?: { judge?: Provider },
    ) {
      const judge = resolveJudge(options);
      const result = await satisfiesCriteria(received, rubric, judge);
      recordResult('toSatisfyCriteria', result, received, judge.model);
      return { pass: result.pass, message: () => result.message };
    },

    async toBeClassifiedAs(
      received: PestResponse,
      label: string,
      options?: ClassificationOptions,
    ) {
      const judge = resolveJudge(options);
      const result = await classifiedAs(received, label, judge, options);
      recordResult('toBeClassifiedAs', result, received, judge.model);
      return { pass: result.pass, message: () => result.message };
    },

    async toNotDisclose(
      received: PestResponse,
      topic: string,
      options?: { judge?: Provider },
    ) {
      const judge = resolveJudge(options);
      const result = await doesNotDisclose(received, topic, judge);
      recordResult('toNotDisclose', result, received, judge.model);
      return { pass: result.pass, message: () => result.message };
    },
  };
}
