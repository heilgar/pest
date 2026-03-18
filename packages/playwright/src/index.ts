export type {
  ClassificationOptions,
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
  createProvider,
  createProviders,
  defineConfig,
  loadConfig,
  send,
  setJudge,
} from '@heilgar/pest-core';
export { pestMatchers } from './matchers.js';

export type { PestPlaywrightMatchers } from './types.js';

// Import types for augmentation side-effect
import './types.js';
