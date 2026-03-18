import { sendAgentic } from '@heilgar/pest-core';
import type {
  PestResponse,
  Provider,
  SendAgenticOptions,
  ToolDefinition,
} from '@heilgar/pest-core';
import type { McpClient } from './client.js';

export interface SendWithMcpOptions extends Omit<SendAgenticOptions, 'executor' | 'tools'> {
  mcpServer: McpClient;
  additionalTools?: ToolDefinition[];
}

/**
 * Send a message to an LLM with MCP server tools auto-discovered
 * and tool calls auto-routed to the MCP server.
 *
 * Returns a standard PestResponse so all existing pest matchers work.
 */
export async function sendWithMcp(
  provider: Provider,
  message: string,
  options: SendWithMcpOptions,
): Promise<PestResponse> {
  const { mcpServer, additionalTools, ...rest } = options;

  const mcpTools = await mcpServer.toPestTools();
  const mcpToolNames = new Set(mcpTools.map((t) => t.function.name));
  const tools = [...mcpTools, ...(additionalTools ?? [])];

  const executor = async (name: string, args: Record<string, unknown>): Promise<string> => {
    if (mcpToolNames.has(name)) {
      const result = await mcpServer.callTool(name, args);
      // Extract text content from MCP result
      const texts = result.content
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text);
      return texts.join('\n') || JSON.stringify(result.content);
    }
    // Non-MCP tool — return empty (user should provide their own executor for these)
    return '[]';
  };

  return sendAgentic(provider, message, {
    ...rest,
    tools,
    executor,
  });
}
