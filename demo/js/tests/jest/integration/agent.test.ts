import '../setup';
import { chat } from '../../../src/agent.js';

const hasKey = !!process.env.OPENAI_API_KEY;

const describeIf = hasKey ? describe : describe.skip;

describeIf('acme store agent — jest', () => {
  test('looks up order when asked', async () => {
    const res = await chat(
      'I need the details for order ORD-12345. What did I order?',
    );

    expect(res).toContainToolCall('lookup_order');
  });

  test('gets product info', async () => {
    const res = await chat('Tell me about the Widget Pro');

    expect(res).toContainToolCall('get_product_info');
  });

  test('no tools for greetings', async () => {
    const res = await chat('Hi there!');

    expect(res).toHaveToolCallCount(0);
  });
});
