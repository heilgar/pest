import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import { mockResponse } from '../../helpers.js';

describe('toContainToolCall', () => {
  test('passes when tool is called', () => {
    const res = mockResponse({
      toolCalls: [{ name: 'search', args: { query: 'pest' } }],
    });
    expect(res).toContainToolCall('search');
  });

  test('passes with matching args (partial)', () => {
    const res = mockResponse({
      toolCalls: [{ name: 'search', args: { query: 'pest', limit: 10 } }],
    });
    expect(res).toContainToolCall('search', { query: 'pest' });
  });

  test('fails when tool is not called', () => {
    const res = mockResponse({ toolCalls: [] });
    expect(() => expect(res).toContainToolCall('search')).toThrow();
  });

  test('fails with non-matching args', () => {
    const res = mockResponse({
      toolCalls: [{ name: 'search', args: { query: 'other' } }],
    });
    expect(() =>
      expect(res).toContainToolCall('search', { query: 'pest' }),
    ).toThrow();
  });

  test('negation: passes when tool is absent', () => {
    const res = mockResponse({ toolCalls: [] });
    expect(res).not.toContainToolCall('search');
  });
});

describe('toCallToolsInOrder', () => {
  test('passes when tools called in order', () => {
    const res = mockResponse({
      toolCalls: [
        { name: 'lookup', args: {} },
        { name: 'refund', args: {} },
      ],
    });
    expect(res).toCallToolsInOrder(['lookup', 'refund']);
  });

  test('passes with extra tools in between', () => {
    const res = mockResponse({
      toolCalls: [
        { name: 'lookup', args: {} },
        { name: 'log', args: {} },
        { name: 'refund', args: {} },
      ],
    });
    expect(res).toCallToolsInOrder(['lookup', 'refund']);
  });

  test('fails when order is reversed', () => {
    const res = mockResponse({
      toolCalls: [
        { name: 'refund', args: {} },
        { name: 'lookup', args: {} },
      ],
    });
    expect(() =>
      expect(res).toCallToolsInOrder(['lookup', 'refund']),
    ).toThrow();
  });
});

describe('toHaveToolCallCount', () => {
  test('passes with correct count', () => {
    const res = mockResponse({
      toolCalls: [
        { name: 'a', args: {} },
        { name: 'b', args: {} },
      ],
    });
    expect(res).toHaveToolCallCount(2);
  });

  test('passes with zero', () => {
    const res = mockResponse({ toolCalls: [] });
    expect(res).toHaveToolCallCount(0);
  });

  test('fails with wrong count', () => {
    const res = mockResponse({ toolCalls: [{ name: 'a', args: {} }] });
    expect(() => expect(res).toHaveToolCallCount(2)).toThrow();
  });
});

describe('toContainText / toNotContainText', () => {
  test('passes when text is present', () => {
    const res = mockResponse({ text: 'Hello world' });
    expect(res).toContainText('hello'); // case insensitive
  });

  test('fails when text is absent', () => {
    const res = mockResponse({ text: 'Hello world' });
    expect(() => expect(res).toContainText('goodbye')).toThrow();
  });

  test('toNotContainText passes when text is absent', () => {
    const res = mockResponse({ text: 'Hello world' });
    expect(res).toNotContainText('goodbye');
  });

  test('toNotContainText fails when text is present', () => {
    const res = mockResponse({ text: 'Hello world' });
    expect(() => expect(res).toNotContainText('hello')).toThrow();
  });
});

describe('toRespondWithinTokens', () => {
  test('passes when within budget', () => {
    const res = mockResponse({
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    });
    expect(res).toRespondWithinTokens(100);
  });

  test('fails when over budget', () => {
    const res = mockResponse({
      usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
    });
    expect(() => expect(res).toRespondWithinTokens(100)).toThrow();
  });
});

describe('toMatchResponseSchema', () => {
  const RecipeSchema = v.object({
    name: v.string(),
    servings: v.number(),
    ingredients: v.array(v.string()),
  });

  test('passes with valid JSON matching schema', () => {
    const res = mockResponse({
      text: JSON.stringify({
        name: 'Pancakes',
        servings: 4,
        ingredients: ['flour', 'eggs'],
      }),
    });
    expect(res).toMatchResponseSchema(RecipeSchema);
  });

  test('fails with invalid JSON', () => {
    const res = mockResponse({ text: 'not json' });
    expect(() => expect(res).toMatchResponseSchema(RecipeSchema)).toThrow();
  });

  test('fails with wrong shape', () => {
    const res = mockResponse({
      text: JSON.stringify({ name: 'Pancakes', servings: 'four' }),
    });
    expect(() => expect(res).toMatchResponseSchema(RecipeSchema)).toThrow();
  });
});
