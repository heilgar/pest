import { loadConfig } from './config/loader.js';
import { createProvider } from './providers/registry.js';
import type { Provider } from './types.js';

/**
 * Resolve the active provider from PEST_PROVIDER env + pest.config.ts.
 *
 * Used in test files so the CLI can switch providers via env:
 * - CLI sets PEST_PROVIDER=gpt4o, then shells out to vitest
 * - Test file calls useProvider() → gets the gpt4o provider
 * - When running vitest directly (no CLI), falls back to first provider in config
 */
export async function useProvider(fallbackName?: string): Promise<Provider> {
  const providerName = process.env.PEST_PROVIDER ?? fallbackName;
  const config = await loadConfig();

  if (providerName) {
    const providerConfig = config.providers.find(
      (p) => p.name === providerName,
    );
    if (!providerConfig) {
      throw new Error(
        `Provider "${providerName}" not found in pest.config.ts. Available: ${config.providers.map((p) => p.name).join(', ')}`,
      );
    }
    return createProvider(providerConfig);
  }

  // Fall back to first provider
  const first = config.providers[0];
  if (!first) {
    throw new Error('No providers configured in pest.config.ts.');
  }
  return createProvider(first);
}

/**
 * Resolve system prompt with PEST_SYSTEM_PROMPT env override.
 *
 * Used in test files so the CLI tune command can swap prompts via env:
 * - CLI sets PEST_SYSTEM_PROMPT=<variant>, then shells out to vitest
 * - Test file calls useSystemPrompt("default...") → gets the variant
 * - When running vitest directly, returns the default
 */
export function useSystemPrompt(defaultPrompt: string): string {
  return process.env.PEST_SYSTEM_PROMPT ?? defaultPrompt;
}
