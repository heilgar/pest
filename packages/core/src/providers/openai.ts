import OpenAI from 'openai';
import type { ProviderConfig } from '../config/schema.js';
import type {
  AgenticMessage,
  Provider,
  ProviderRequestOptions,
  ProviderResponse,
  ToolCall,
} from '../types.js';

function toOpenAIMessages(
  messages: AgenticMessage[],
  systemPrompt?: string,
): OpenAI.ChatCompletionMessageParam[] {
  const result: OpenAI.ChatCompletionMessageParam[] = [
    ...(systemPrompt
      ? [{ role: 'system' as const, content: systemPrompt }]
      : []),
  ];

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      if (msg.toolCalls?.length) {
        result.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id ?? `call_${tc.name}`,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.args) },
          })),
        });
      } else {
        result.push({ role: 'assistant', content: msg.content });
      }
    } else if (msg.role === 'tool') {
      result.push({
        role: 'tool',
        tool_call_id: msg.toolCallId,
        content: msg.content,
      });
    }
  }

  return result;
}

export function createOpenAIProvider(config: ProviderConfig): Provider {
  const client = new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseUrl && { baseURL: config.baseUrl }),
  });

  return {
    name: config.name,
    model: config.model,
    async call(options: ProviderRequestOptions): Promise<ProviderResponse> {
      const tools = options.tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters as Record<string, unknown>,
        },
      }));

      const response = await client.chat.completions.create({
        model: config.model,
        messages: toOpenAIMessages(options.messages, options.systemPrompt),
        temperature: options.temperature ?? config.temperature,
        ...(options.maxTokens && { max_tokens: options.maxTokens }),
        ...(options.responseFormat === 'json' && {
          response_format: { type: 'json_object' },
        }),
        ...(tools?.length && { tools }),
      });

      const choice = response.choices[0];
      const message = choice?.message;

      const toolCalls: ToolCall[] =
        message?.tool_calls
          ?.filter(
            (tc): tc is Extract<typeof tc, { type: 'function' }> =>
              tc.type === 'function',
          )
          .map((tc) => {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments) as Record<
                string,
                unknown
              >;
            } catch {
              args = { __raw: tc.function.arguments };
            }
            return { id: tc.id, name: tc.function.name, args };
          }) ?? [];

      return {
        text: message?.content ?? '',
        toolCalls,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        raw: response,
      };
    },
  };
}
