import { createProvider, send } from '@heilgar/pest-core';
import { describe, expect, test } from 'vitest';

const hasKey = !!process.env.OPENAI_API_KEY;

const provider = hasKey
  ? createProvider({ name: 'gpt4o-mini', type: 'openai', model: 'gpt-4o-mini' })
  : (null as any);

const systemPrompt =
  'You are a helpful travel assistant. Use the provided tools to help users.';

const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'search_flights',
      description: 'Search for flights between cities',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: 'Departure city' },
          destination: { type: 'string', description: 'Arrival city' },
        },
        required: ['origin', 'destination'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_hotels',
      description: 'Search for hotels in a city',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City to search hotels in' },
        },
        required: ['city'],
      },
    },
  },
];

describe.skipIf(!hasKey)('deterministic matchers with real LLM', () => {
  test('toContainToolCall — flight search', async () => {
    const res = await send(provider, 'Find flights from New York to London', {
      systemPrompt,
      tools,
    });

    expect(res).toContainToolCall('search_flights');
  });

  test('toContainToolCall with args', async () => {
    const res = await send(provider, 'Search for hotels in Paris', {
      systemPrompt,
      tools,
    });

    expect(res).toContainToolCall('search_hotels', { city: 'Paris' });
  });

  test('toHaveToolCallCount', async () => {
    const res = await send(provider, 'Hello, how are you?', {
      systemPrompt,
      tools,
    });

    expect(res).toHaveToolCallCount(0);
  });

  test('toContainText', async () => {
    const res = await send(
      provider,
      'What is the capital of France? Answer in one word.',
      {
        systemPrompt: 'Answer factual questions concisely.',
      },
    );

    expect(res).toContainText('Paris');
  });

  test('toRespondWithinTokens', async () => {
    const res = await send(provider, 'Say yes.', {
      systemPrompt: 'Respond with a single word only.',
    });

    expect(res).toRespondWithinTokens(10);
  });
});
