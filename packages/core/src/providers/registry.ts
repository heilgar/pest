import { loadEnv } from '../config/loader.js';
import type { ProviderConfig } from '../config/schema.js';
import type { Provider } from '../types.js';
import { createAnthropicProvider } from './anthropic.js';
import { createGeminiProvider } from './gemini.js';
import { createOllamaProvider } from './ollama.js';
import { createOpenAIProvider } from './openai.js';
import { createXaiProvider } from './xai.js';

type ProviderFactory = (config: ProviderConfig) => Provider;

const builtinFactories: Record<string, ProviderFactory> = {
  openai: createOpenAIProvider,
  anthropic: createAnthropicProvider,
  gemini: createGeminiProvider,
  xai: createXaiProvider,
  ollama: createOllamaProvider,
};

export function createProvider(config: ProviderConfig): Provider {
  // Ensure .env files are loaded so API keys are available
  loadEnv();

  const factory = builtinFactories[config.type];
  if (!factory) {
    throw new Error(
      `Unknown provider type: "${config.type}". Available: ${Object.keys(builtinFactories).join(', ')}`,
    );
  }
  return factory(config);
}

export function createProviders(
  configs: ProviderConfig[],
): Map<string, Provider> {
  const providers = new Map<string, Provider>();
  for (const config of configs) {
    providers.set(config.name, createProvider(config));
  }
  return providers;
}
