import type { ProviderConfig } from '../config/schema.js';
import type { Provider } from '../types.js';
import { createOpenAIProvider } from './openai.js';

export function createOllamaProvider(config: ProviderConfig): Provider {
  return createOpenAIProvider({
    ...config,
    baseUrl: config.baseUrl ?? 'http://localhost:11434/v1',
    apiKey: config.apiKey ?? 'ollama',
  });
}
