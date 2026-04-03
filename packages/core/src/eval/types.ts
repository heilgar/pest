import type {
  AgenticMessage,
  ToolCall,
  ToolDefinition,
  ToolExecutor,
} from '../types.js';

export interface MatcherSpec {
  type: string;
  args: unknown[];
}

export interface EvalCaseDefaults {
  systemPrompt?: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface EvalCase {
  name: string;
  messages: AgenticMessage[];
  systemPrompt?: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  matchers?: MatcherSpec[];
  rubrics?: string[];
  agentic?: {
    toolExecutor: ToolExecutor;
    maxTurns?: number;
  };
}

export interface EvalSuite {
  providers: string[];
  judge?: string;
  defaults?: EvalCaseDefaults;
  cases: EvalCase[];
}

export type EvalSuiteFactory = () => EvalSuite | Promise<EvalSuite>;

export interface MatcherResultEntry {
  type: string;
  pass: boolean;
}

export interface RubricResultEntry {
  rubric: string;
  score: number;
  reasoning: string;
}

export interface ProviderCaseResult {
  response: {
    text: string;
    toolCalls: ToolCall[];
    usage: { inputTokens: number; outputTokens: number };
    latencyMs: number;
  };
  matchers: MatcherResultEntry[];
  rubrics: RubricResultEntry[];
  composite: number;
  costCents: number;
  error?: string;
}

export interface CaseResult {
  case: string;
  suite: string;
  providers: Record<string, ProviderCaseResult>;
}

export interface ProviderSummary {
  score: number;
  passRate: string;
  avgLatencyMs: number;
  totalCostCents: number;
  totalTokens: number;
}

export interface EvalOutput {
  timestamp: string;
  config: {
    providers: string[];
    judge: string;
    suites: string[];
  };
  results: CaseResult[];
  summary: Record<string, ProviderSummary>;
}
