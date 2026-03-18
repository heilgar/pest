// Types

// Config
export {
  defineConfig,
  loadConfig,
  loadEnv,
  resetEnv,
} from './config/loader.js';
export type { PestConfig, ProviderConfig } from './config/schema.js';
export type { JudgeResult } from './evaluator/judge.js';
// Helpers
export { useProvider, useSystemPrompt } from './helpers.js';
// Judge provider
export { getJudge, resolveJudge, setJudge } from './judge-provider.js';
export type {
  ClassificationOptions,
  MatcherResult,
  RubricConfig,
  SemanticOptions,
} from './matcher-logic.js';
// Deterministic matchers
// LLM-judged matchers
// Standalone functions
export {
  assertConsistent,
  callsToolsInOrder,
  classifiedAs,
  containsText,
  containsToolCall,
  doesNotDisclose,
  hasToolCallCount,
  matchesResponseSchema,
  matchesSemanticMeaning,
  respondsWithinTokens,
  satisfiesCriteria,
} from './matcher-logic.js';
export type { ModelPricing } from './providers/pricing.js';
export {
  estimateCostCents,
  getPricing,
  resetPricing,
  setPricing,
} from './providers/pricing.js';
// Providers
export { createProvider, createProviders } from './providers/registry.js';
// Core
export { send } from './send.js';
export { sendAgentic } from './send-agentic.js';
export type {
  AgenticMessage,
  PestResponse,
  Provider,
  ProviderRequestOptions,
  ProviderResponse,
  ProviderUsage,
  SendAgenticOptions,
  SendOptions,
  ToolCall,
  ToolDefinition,
  ToolExecutor,
} from './types.js';
export { zodTool } from './zod-tool.js';

// --- Internal APIs (used by extensions, not for end users) ---

export type { MatcherEntry, SendEntry, TestData } from './accumulator.js';
// @internal — used by vitest/jest setup and matchers
export {
  buildMatcherEntry,
  clearAll,
  endTest,
  getAllTestData,
  getTestData,
  record,
  recordSend,
  startTest,
} from './accumulator.js';
export {
  ansi,
  escapeHtml,
  formatCost,
  formatDuration,
  formatTokens,
} from './format.js';
// @internal — shared matchers factory for vitest/jest extensions
export { createPestMatchers } from './matchers-factory.js';
export type {
  LogEntry,
  ReporterOptions,
  RunStats,
  TestResult,
} from './report-data.js';
// @internal — shared reporter logic for vitest/jest extensions
export {
  emptyStats,
  finishReport,
  processTestResult,
} from './report-data.js';
// @internal — used by vitest/jest reporters
export { buildHtmlReport } from './report-html.js';
// @internal — used by vitest/jest/playwright extensions
export { onSend } from './send.js';
