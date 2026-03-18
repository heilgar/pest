import { GoogleGenAI } from '@google/genai';
import type { ProviderConfig } from '../config/schema.js';
import type {
  AgenticMessage,
  Provider,
  ProviderRequestOptions,
  ProviderResponse,
  ToolCall,
} from '../types.js';

function toGeminiContents(messages: AgenticMessage[]) {
  type Part =
    | { text: string }
    | { functionCall: { name: string; args: Record<string, unknown> } }
    | { functionResponse: { name: string; response: { result: unknown } } };

  const result: { role: string; parts: Part[] }[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      result.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant') {
      const parts: Part[] = [];
      if (msg.content) parts.push({ text: msg.content });
      for (const tc of msg.toolCalls ?? []) {
        parts.push({ functionCall: { name: tc.name, args: tc.args } });
      }
      result.push({ role: 'model', parts });
    } else if (msg.role === 'tool') {
      // Gemini expects functionResponse in a user-role turn
      const last = result[result.length - 1];
      const part: Part = {
        functionResponse: {
          name: msg.toolCallName,
          response: { result: msg.content },
        },
      };
      if (last?.role === 'user') {
        last.parts.push(part);
      } else {
        result.push({ role: 'user', parts: [part] });
      }
    }
  }

  return result;
}

export function createGeminiProvider(config: ProviderConfig): Provider {
  const client = new GoogleGenAI({ apiKey: config.apiKey });

  return {
    name: config.name,
    model: config.model,
    async call(options: ProviderRequestOptions): Promise<ProviderResponse> {
      const contents = toGeminiContents(options.messages);

      const tools = options.tools?.length
        ? [
            {
              functionDeclarations: options.tools.map((t) => ({
                name: t.function.name,
                description: t.function.description ?? '',
                parameters: t.function.parameters,
              })),
            },
          ]
        : undefined;

      const response = await client.models.generateContent({
        model: config.model,
        contents,
        config: {
          systemInstruction: options.systemPrompt,
          temperature: options.temperature ?? config.temperature,
          ...(options.maxTokens && { maxOutputTokens: options.maxTokens }),
          tools,
        },
      });

      const toolCalls: ToolCall[] = [];
      let text = '';

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            text += part.text;
          }
          if (part.functionCall) {
            toolCalls.push({
              // Gemini has no stable tool call ID — use name as fallback
              id: part.functionCall.name ?? '',
              name: part.functionCall.name ?? '',
              args: (part.functionCall.args ?? {}) as Record<string, unknown>,
            });
          }
        }
      }

      return {
        text,
        toolCalls,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        },
        raw: response,
      };
    },
  };
}
