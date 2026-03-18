import type { ProviderConfig } from '../config/schema.js';
import type { Provider } from '../types.js';
import { createOpenAIProvider } from './openai.js';

export function createXaiProvider(config: ProviderConfig): Provider {
  return createOpenAIProvider({
    ...config,
    baseUrl: config.baseUrl ?? 'https://api.x.ai/v1',
  });
}
