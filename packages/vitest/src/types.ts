import type {
  ClassificationOptions,
  Provider,
  RubricConfig,
  SemanticOptions,
} from '@heilgar/pest-core';

declare module 'vitest' {
  // biome-ignore lint/suspicious/noExplicitAny: must match vitest's existing type parameter
  interface Assertion<T = any> {
    toContainToolCall(name: string, args?: Record<string, unknown>): void;
    toCallToolsInOrder(names: string[]): void;
    toMatchResponseSchema(schema: unknown): void;
    toRespondWithinTokens(maxTokens: number): void;
    toContainText(text: string): void;
    toNotContainText(text: string): void;
    toHaveToolCallCount(count: number): void;
    toMatchSemanticMeaning(
      expected: string,
      options?: SemanticOptions,
    ): Promise<void>;
    toSatisfyCriteria(
      rubric: string | RubricConfig,
      options?: { judge?: Provider },
    ): Promise<void>;
    toBeClassifiedAs(
      label: string,
      options?: ClassificationOptions,
    ): Promise<void>;
    toNotDisclose(topic: string, options?: { judge?: Provider }): Promise<void>;
  }
}
