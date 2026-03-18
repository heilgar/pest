export type {
  ClassificationOptions,
  MatcherResult,
  PestConfig,
  PestResponse,
  Provider,
  ProviderConfig,
  RubricConfig,
  SemanticOptions,
  SendOptions,
  ToolCall,
  ToolDefinition,
} from '@heilgar/pest-core';
// Re-export core essentials for convenience
export {
  assertConsistent,
  createProvider,
  createProviders,
  defineConfig,
  loadConfig,
  send,
  setJudge,
} from '@heilgar/pest-core';
export { pestMatchers } from './matchers.js';
export type { PestJestReporterOptions } from './reporter.js';
export { default as PestReporter } from './reporter.js';

// Import types for augmentation side-effect
import './types.js';
