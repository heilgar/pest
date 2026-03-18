export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  /** Provider-assigned ID — required for multi-turn tool result routing */
  id?: string;
}

export type AgenticMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallName: string; toolCallId: string; content: string };

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<unknown> | unknown;

export interface SendAgenticOptions extends SendOptions {
  /** Called for each tool invocation. Defaults to returning '[]' (no-op mock). */
  executor?: ToolExecutor;
  /** Max tool-calling iterations before stopping. Default: 10 */
  maxSteps?: number;
}

export interface ProviderUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ProviderResponse {
  text: string;
  toolCalls: ToolCall[];
  usage: ProviderUsage;
  raw: unknown;
}

export interface ProviderRequestOptions {
  systemPrompt?: string;
  messages: AgenticMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface Provider {
  name: string;
  model: string;
  call(options: ProviderRequestOptions): Promise<ProviderResponse>;
}

export interface PestResponse extends ProviderResponse {
  latencyMs: number;
  provider: string;
  model: string;
}

export interface SendOptions {
  systemPrompt?: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}
