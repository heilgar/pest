import type { MatcherResult } from './matcher-logic.js';
import type { ProviderUsage, ToolCall } from './types.js';

export interface SendEntry {
  input: string;
  output: string;
  systemPrompt?: string;
  provider: string;
  model: string;
  latencyMs: number;
  usage: ProviderUsage;
  toolCalls: ToolCall[];
  timestamp: number;
}

export interface MatcherEntry {
  matcher: string;
  pass: boolean;
  score?: number;
  reasoning?: string;
  response?: {
    provider: string;
    model: string;
    latencyMs: number;
    usage: ProviderUsage;
    toolCalls: ToolCall[];
    text: string;
  };
  judgeModel?: string;
}

export interface TestData {
  testId: string;
  testName?: string;
  startTime: number;
  endTime?: number;
  sends: SendEntry[];
  entries: MatcherEntry[];
}

const store = new Map<string, TestData>();

export function startTest(testId: string, testName?: string): void {
  store.set(testId, {
    testId,
    testName,
    startTime: Date.now(),
    sends: [],
    entries: [],
  });
}

export function endTest(testId: string): void {
  const data = store.get(testId);
  if (data) {
    data.endTime = Date.now();
  }
}

export function recordSend(testId: string, entry: SendEntry): void {
  const data = store.get(testId);
  if (data) {
    data.sends.push(entry);
  }
}

export function record(testId: string, entry: MatcherEntry): void {
  const data = store.get(testId);
  if (data) {
    data.entries.push(entry);
  }
}

export function getTestData(testId: string): TestData | undefined {
  return store.get(testId);
}

export function getAllTestData(): Map<string, TestData> {
  return store;
}

export function clearAll(): void {
  store.clear();
}

export function buildMatcherEntry(
  matcher: string,
  result: MatcherResult,
  response?: {
    provider: string;
    model: string;
    latencyMs: number;
    usage: ProviderUsage;
    toolCalls: ToolCall[];
    text: string;
  },
  judgeModel?: string,
): MatcherEntry {
  return {
    matcher,
    pass: result.pass,
    score: result.score,
    reasoning: result.reasoning,
    response: response
      ? {
          provider: response.provider,
          model: response.model,
          latencyMs: response.latencyMs,
          usage: { ...response.usage },
          toolCalls: response.toolCalls,
          text: response.text,
        }
      : undefined,
    judgeModel,
  };
}
