import {
  createProvider,
  type PestResponse,
  type Provider,
  send,
} from '@heilgar/pest-core';
import { SYSTEM_PROMPT } from './prompt.js';
import { tools } from './tools.js';

export function createAgent(provider?: Provider): Provider {
  return (
    provider ??
    createProvider({
      name: 'gpt4o-mini',
      type: 'openai',
      model: 'gpt-4o-mini',
    })
  );
}

export async function chat(
  message: string,
  provider?: Provider,
): Promise<PestResponse> {
  const agent = createAgent(provider);
  return send(agent, message, {
    systemPrompt: SYSTEM_PROMPT,
    tools,
  });
}
