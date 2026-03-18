import '../setup';
import { mockResponse } from '../../helpers';

describe('agent tool routing (mocked) — jest', () => {
  test('order lookup calls lookup_order', () => {
    const res = mockResponse({
      text: 'Let me look up that order for you.',
      toolCalls: [{ name: 'lookup_order', args: { order_id: 'ORD-12345' } }],
    });

    expect(res).toContainToolCall('lookup_order', { order_id: 'ORD-12345' });
    expect(res).toHaveToolCallCount(1);
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

  test('response token budget check', () => {
    const res = mockResponse({
      usage: { inputTokens: 200, outputTokens: 50, totalTokens: 250 },
    });

    expect(res).toRespondWithinTokens(100);
  });
});
