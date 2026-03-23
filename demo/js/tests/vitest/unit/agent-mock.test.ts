import { describe, expect, test } from 'vitest';
import { mockResponse } from '../../helpers.js';

describe('agent tool routing (mocked)', () => {
  test('order lookup calls lookup_order', () => {
    const res = mockResponse({
      text: 'Let me look up that order for you.',
      toolCalls: [{ name: 'lookup_order', args: { order_id: 'ORD-12345' } }],
    });

    expect(res).toContainToolCall('lookup_order', { order_id: 'ORD-12345' });
    expect(res).toHaveToolCallCount(1);
  });

  test('product question calls get_product_info', () => {
    const res = mockResponse({
      text: 'Here is the product info.',
      toolCalls: [
        { name: 'get_product_info', args: { product: 'Widget Pro' } },
      ],
    });

    expect(res).toContainToolCall('get_product_info', {
      product: 'Widget Pro',
    });
  });

  test('refund request looks up order then processes refund', () => {
    const res = mockResponse({
      toolCalls: [
        { name: 'lookup_order', args: { order_id: 'ORD-12345' } },
        {
          name: 'process_refund',
          args: { order_id: 'ORD-12345', reason: 'defective' },
        },
      ],
    });

    expect(res).toCallToolsInOrder(['lookup_order', 'process_refund']);
    expect(res).toHaveToolCallCount(2);
  });

  test('greeting does not call any tools', () => {
    const res = mockResponse({
      text: 'Hello! Welcome to Acme Store. How can I help you today?',
      toolCalls: [],
    });

    expect(res).toHaveToolCallCount(0);
    expect(res).toContainText('help');
  });

  test('shipping check calls check_shipping', () => {
    const res = mockResponse({
      toolCalls: [{ name: 'check_shipping', args: { order_id: 'ORD-67890' } }],
    });

    expect(res).toContainToolCall('check_shipping', { order_id: 'ORD-67890' });
  });

  test('response stays within token budget', () => {
    const res = mockResponse({
      text: 'Your order has been delivered.',
      usage: { inputTokens: 200, outputTokens: 50, totalTokens: 250 },
    });

    expect(res).toRespondWithinTokens(100);
  });
});
