export type {
  AgenticMessage,
  ClassificationOptions,
  MatcherResult,
  PestConfig,
  PestResponse,
  Provider,
  ProviderConfig,
  RubricConfig,
  SemanticOptions,
  SendAgenticOptions,
  SendOptions,
  ToolCall,
  ToolDefinition,
  ToolExecutor,
} from '@heilgar/pest-core';
// Re-export core essentials for convenience
export {
  assertConsistent,
  createProvider,
  createProviders,
  defineConfig,
  loadConfig,
  send,
  sendAgentic,
  setJudge,
  zodTool,
} from '@heilgar/pest-core';
export { pestMatchers } from './matchers.js';
export { pestPlugin } from './plugin.js';
export type { PestReporterOptions } from './reporter.js';
export { default as PestReporter } from './reporter.js';

// Import types for augmentation side-effect
import './types.js';
