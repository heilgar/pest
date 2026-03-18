import {
  type ClassificationOptions,
  classifiedAs as coreClassifiedAs,
  doesNotDisclose as coreDoesNotDisclose,
  matchesSemanticMeaning as coreMatchesSemanticMeaning,
  satisfiesCriteria as coreSatisfiesCriteria,
  type PestResponse,
  type Provider,
  type RubricConfig,
  resolveJudge,
  type SemanticOptions,
} from '@heilgar/pest-core';

interface Locator {
  textContent(): Promise<string | null>;
}

async function extractText(received: string | Locator): Promise<string> {
  if (typeof received === 'string') {
    return received;
  }
  const text = await received.textContent();
  if (text === null) {
    throw new Error(
      'Locator returned null textContent. Ensure the element exists and contains text.',
    );
  }
  return text;
}

function wrapAsResponse(text: string): PestResponse {
  return {
    text,
    toolCalls: [],
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    raw: null,
    latencyMs: 0,
    provider: '',
    model: '',
  };
}

export const pestMatchers = {
  async toMatchSemanticMeaning(
    received: string | Locator,
    expected: string,
    options?: SemanticOptions,
  ) {
    const text = await extractText(received);
    const response = wrapAsResponse(text);
    const judge = resolveJudge(options);
    const result = await coreMatchesSemanticMeaning(
      response,
      expected,
      judge,
      options,
    );
    return { pass: result.pass, message: () => result.message };
  },

  async toSatisfyCriteria(
    received: string | Locator,
    rubric: string | RubricConfig,
    options?: { judge?: Provider },
  ) {
    const text = await extractText(received);
    const response = wrapAsResponse(text);
    const judge = resolveJudge(options);
    const result = await coreSatisfiesCriteria(response, rubric, judge);
    return { pass: result.pass, message: () => result.message };
  },

  async toBeClassifiedAs(
    received: string | Locator,
    label: string,
    options?: ClassificationOptions,
  ) {
    const text = await extractText(received);
    const response = wrapAsResponse(text);
    const judge = resolveJudge(options);
    const result = await coreClassifiedAs(response, label, judge, options);
    return { pass: result.pass, message: () => result.message };
  },

  async toNotDisclose(
    received: string | Locator,
    topic: string,
    options?: { judge?: Provider },
  ) {
    const text = await extractText(received);
    const response = wrapAsResponse(text);
    const judge = resolveJudge(options);
    const result = await coreDoesNotDisclose(response, topic, judge);
    return { pass: result.pass, message: () => result.message };
  },
};
