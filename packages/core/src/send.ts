import type { SendEntry } from './accumulator.js';
import type { PestResponse, Provider, SendOptions } from './types.js';

type SendHook = (entry: SendEntry) => void;
const sendHooks: SendHook[] = [];

/**
 * Register a hook that gets called after every send() call.
 * Used by extensions to capture LLM input/output for reporters.
 * Returns a dispose function to remove the hook.
 */
export function onSend(hook: SendHook): () => void {
  sendHooks.push(hook);
  return () => {
    const idx = sendHooks.indexOf(hook);
    if (idx >= 0) sendHooks.splice(idx, 1);
  };
}

export async function send(
  provider: Provider,
  message: string,
  options?: SendOptions,
): Promise<PestResponse> {
  const start = performance.now();

  const response = await provider.call({
    systemPrompt: options?.systemPrompt,
    messages: [{ role: 'user', content: message }],
    tools: options?.tools,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    responseFormat: options?.responseFormat,
  });

  const latencyMs = performance.now() - start;

  const result: PestResponse = {
    ...response,
    latencyMs,
    provider: provider.name,
    model: provider.model,
  };

  if (sendHooks.length > 0) {
    const entry: SendEntry = {
      input: message,
      output: response.text,
      systemPrompt: options?.systemPrompt,
      provider: provider.name,
      model: provider.model,
      latencyMs,
      usage: { ...response.usage },
      toolCalls: response.toolCalls,
      timestamp: Date.now(),
    };
    for (const hook of sendHooks) {
      hook(entry);
    }
  }

  return result;
}
