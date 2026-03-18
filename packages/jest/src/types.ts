import type {
  ClassificationOptions,
  Provider,
  RubricConfig,
  SemanticOptions,
} from '@heilgar/pest-core';

declare global {
  namespace jest {
    interface Matchers<R> {
      toContainToolCall(name: string, args?: Record<string, unknown>): R;
      toCallToolsInOrder(names: string[]): R;
      toMatchResponseSchema(schema: unknown): R;
      toRespondWithinTokens(maxTokens: number): R;
      toContainText(text: string): R;
      toNotContainText(text: string): R;
      toHaveToolCallCount(count: number): R;
      toMatchSemanticMeaning(
        expected: string,
        options?: SemanticOptions,
      ): Promise<R>;
      toSatisfyCriteria(
        rubric: string | RubricConfig,
        options?: { judge?: Provider },
      ): Promise<R>;
      toBeClassifiedAs(
        label: string,
        options?: ClassificationOptions,
      ): Promise<R>;
      toNotDisclose(topic: string, options?: { judge?: Provider }): Promise<R>;
    }
  }
}
