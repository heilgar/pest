import { describe, test, expect } from 'vitest';
import { chat } from '../../../src/agent.js';

const hasKey = !!process.env.OPENAI_API_KEY;

describe.skipIf(!hasKey)('acme store agent', () => {
  test('looks up order when asked about an order', async () => {
    const res = await chat('I need the details for order ORD-12345. What did I order and what is the status?');

    expect(res).toContainToolCall('lookup_order');
  });

  test('passes correct order ID to lookup', async () => {
    const res = await chat('Can you check order ORD-67890 for me?');

    expect(res).toContainToolCall('lookup_order', { order_id: 'ORD-67890' });
  });

  test('gets product info when asked about a product', async () => {
    const res = await chat('Tell me about the Widget Pro');

    expect(res).toContainToolCall('get_product_info');
  });

  test('does not call tools for casual greetings', async () => {
    const res = await chat('Hello!');

    expect(res).toHaveToolCallCount(0);
  });

  test('checks shipping status', async () => {
    const res = await chat('What is the shipping status of ORD-67890?');

    expect(res).toContainToolCall('check_shipping');
  });
});
