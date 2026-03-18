import Anthropic from '@anthropic-ai/sdk';
import type { ProviderConfig } from '../config/schema.js';
import type {
  AgenticMessage,
  Provider,
  ProviderRequestOptions,
  ProviderResponse,
  ToolCall,
} from '../types.js';

function toAnthropicMessages(
  messages: AgenticMessage[],
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      const content: (
        | Anthropic.TextBlockParam
        | Anthropic.ToolUseBlockParam
      )[] = [];
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }
      for (const tc of msg.toolCalls ?? []) {
        content.push({
          type: 'tool_use',
          id: tc.id ?? `tool_${tc.name}`,
          name: tc.name,
          input: tc.args,
        });
      }
      result.push({ role: 'assistant', content });
    } else if (msg.role === 'tool') {
      // Group consecutive tool results into a single user message with content array
      const last = result[result.length - 1];
      const toolResult: Anthropic.ToolResultBlockParam = {
        type: 'tool_result',
        tool_use_id: msg.toolCallId,
        content: msg.content,
      };
      if (last?.role === 'user' && Array.isArray(last.content)) {
        (last.content as Anthropic.ToolResultBlockParam[]).push(toolResult);
      } else {
        result.push({ role: 'user', content: [toolResult] });
      }
    }
  }

  return result;
}

export function createAnthropicProvider(config: ProviderConfig): Provider {
  const client = new Anthropic({
    apiKey: config.apiKey,
    ...(config.baseUrl && { baseURL: config.baseUrl }),
  });

  return {
    name: config.name,
    model: config.model,
    async call(options: ProviderRequestOptions): Promise<ProviderResponse> {
      const tools = options.tools?.map((t) => ({
        name: t.function.name,
        description: t.function.description ?? '',
        input_schema: (t.function.parameters ?? {
          type: 'object',
          properties: {},
        }) as Anthropic.Tool['input_schema'],
      }));

      const response = await client.messages.create({
        model: config.model,
        max_tokens: options.maxTokens ?? 4096,
        ...(options.systemPrompt && { system: options.systemPrompt }),
        messages: toAnthropicMessages(options.messages),
        temperature: options.temperature ?? config.temperature,
        ...(tools?.length && { tools }),
      });

      let text = '';
      const toolCalls: ToolCall[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          text += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            args: block.input as Record<string, unknown>,
          });
        }
      }

      return {
        text,
        toolCalls,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens:
            response.usage.input_tokens + response.usage.output_tokens,
        },
        raw: response,
      };
    },
  };
}
