import type { Plugin } from 'vitest/config';

export function pestPlugin(): Plugin {
  return {
    name: 'pest',
    config(config) {
      const test = (config as Record<string, unknown>).test as
        | { setupFiles?: string | string[] }
        | undefined;
      const existing = test?.setupFiles ?? [];
      const existingArray = Array.isArray(existing) ? existing : [existing];
      return {
        test: {
          setupFiles: [...existingArray, '@heilgar/pest-vitest/setup'],
        },
      };
    },
  };
}
