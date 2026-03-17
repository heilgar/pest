import type { PestResponse } from '@heilgar/pest-core';

/**
 * Create a mock PestResponse for unit testing matchers.
 * No LLM call needed — just construct the shape.
 */
export function mockResponse(overrides: Partial<PestResponse> = {}): PestResponse {
  return {
    text: '',
    toolCalls: [],
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    raw: null,
    latencyMs: 0,
    provider: 'mock',
    model: 'mock-model',
    ...overrides,
  };
}
