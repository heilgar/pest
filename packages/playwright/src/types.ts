import type {
  ClassificationOptions,
  Provider,
  RubricConfig,
  SemanticOptions,
} from '@heilgar/pest-core';

export interface PestPlaywrightMatchers {
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

declare global {
  namespace PlaywrightTest {
    interface Matchers<R, T> extends PestPlaywrightMatchers {}
  }
}
