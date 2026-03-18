import type { McpClient } from './client.js';

declare module 'vitest' {
  // biome-ignore lint/suspicious/noExplicitAny: must match vitest's existing type parameter
  interface Assertion<T = any> {
    toExposeTools(names: string[]): Promise<void>;
    toExposeTool(name: string): Promise<void>;
    toHaveValidToolSchemas(): Promise<void>;
    toExposePrompts(names: string[]): Promise<void>;
    toExposeResources(uris: string[]): Promise<void>;
  }
}
