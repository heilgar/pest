import type {
  AgenticMessage,
  PestResponse,
  Provider,
  ProviderUsage,
  SendAgenticOptions,
  ToolCall,
  ToolExecutor,
} from './types.js';

const DEFAULT_MAX_STEPS = 10;

const noopExecutor: ToolExecutor = () => '[]';

function sumUsage(a: ProviderUsage, b: ProviderUsage): ProviderUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

/**
 * Run a full agentic tool-call loop and return a single PestResponse with all
 * accumulated tool calls across all steps.
 *
 * This lets you use toContainToolCall, toCallToolsInOrder, toHaveToolCallCount
 * on multi-turn tool-calling conversations.
 *
 * @example
 * const res = await sendAgentic(provider, 'List then create a segment', {
 *   systemPrompt,
 *   tools,
 *   executor: async (name, args) => myApp.handleTool(name, args),
 * });
 * expect(res).toCallToolsInOrder(['list_segments', 'create_segment']);
 */
export async function sendAgentic(
  provider: Provider,
  message: string,
  options?: SendAgenticOptions,
): Promise<PestResponse> {
  const start = performance.now();
  const executor = options?.executor ?? noopExecutor;
  const maxSteps = options?.maxSteps ?? DEFAULT_MAX_STEPS;

  const history: AgenticMessage[] = [{ role: 'user', content: message }];

  let totalUsage: ProviderUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
  const allToolCalls: ToolCall[] = [];
  let lastText = '';
  let lastRaw: unknown;

  for (let step = 0; step < maxSteps; step++) {
    const response = await provider.call({
      systemPrompt: options?.systemPrompt,
      messages: history,
      tools: options?.tools,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      responseFormat: options?.responseFormat,
    });

    totalUsage = sumUsage(totalUsage, response.usage);
    lastText = response.text;
    lastRaw = response.raw;

    if (response.toolCalls.length === 0) {
      // No more tool calls — loop is done
      break;
    }

    // Accumulate tool calls across all steps
    allToolCalls.push(...response.toolCalls);

    // Append assistant turn with tool calls to history
    history.push({
      role: 'assistant',
      content: response.text,
      toolCalls: response.toolCalls,
    });

    // Execute each tool and append results
    for (const tc of response.toolCalls) {
      let result: unknown;
      try {
        result = await executor(tc.name, tc.args);
      } catch (err) {
        result = String(err);
      }

      history.push({
        role: 'tool',
        toolCallName: tc.name,
        toolCallId: tc.id ?? tc.name,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      });
    }

    if (step === maxSteps - 1) {
      console.warn(
        `[pest] sendAgentic: maxSteps (${maxSteps}) reached — the model may not have finished its tool-calling loop. ` +
          'Increase maxSteps or check your tools/prompt.',
      );
    }
  }

  const latencyMs = performance.now() - start;

  return {
    text: lastText,
    toolCalls: allToolCalls,
    usage: totalUsage,
    raw: lastRaw,
    latencyMs,
    provider: provider.name,
    model: provider.model,
  };
}
