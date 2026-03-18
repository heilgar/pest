import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ToolDefinition } from '@heilgar/pest-core';
import type {
  McpServerConfig,
  McpTool,
  McpToolResult,
  McpPrompt,
  McpPromptResult,
  McpResource,
  McpResourceResult,
} from './types.js';

const DEFAULT_TIMEOUT = 30_000;

export class McpClient {
  readonly name: string;
  private client: Client;

  private constructor(name: string, client: Client) {
    this.name = name;
    this.client = client;
  }

  static async fromConfig(
    name: string,
    config: McpServerConfig,
    options?: { timeout?: number },
  ): Promise<McpClient> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const client = new Client({ name: `pest-mcp-${name}`, version: '1.0.0' });

    let transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;

    if ('transport' in config && config.transport === 'sse') {
      transport = new SSEClientTransport(new URL(config.url));
    } else if ('transport' in config && config.transport === 'http') {
      transport = new StreamableHTTPClientTransport(new URL(config.url));
    } else {
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env
          ? { ...process.env, ...config.env } as Record<string, string>
          : undefined,
      });
    }

    const connectPromise = client.connect(transport);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`MCP server "${name}" did not respond within ${timeout}ms`)),
        timeout,
      ),
    );

    await Promise.race([connectPromise, timeoutPromise]);

    return new McpClient(name, client);
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  // --- Discovery ---

  async listTools(): Promise<McpTool[]> {
    const { tools } = await this.client.listTools();
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));
  }

  async listPrompts(): Promise<McpPrompt[]> {
    const { prompts } = await this.client.listPrompts();
    return prompts.map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments?.map((a) => ({
        name: a.name,
        description: a.description,
        required: a.required,
      })),
    }));
  }

  async listResources(): Promise<McpResource[]> {
    const { resources } = await this.client.listResources();
    return resources.map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    }));
  }

  // --- Execution ---

  async callTool(name: string, args?: Record<string, unknown>): Promise<McpToolResult> {
    const result = await this.client.callTool({ name, arguments: args });
    return {
      content: (result.content ?? []) as McpToolResult['content'],
      structuredContent: result.structuredContent as Record<string, unknown> | undefined,
      isError: result.isError as boolean | undefined,
    };
  }

  async getPrompt(name: string, args?: Record<string, string>): Promise<McpPromptResult> {
    const result = await this.client.getPrompt({ name, arguments: args });
    return {
      messages: result.messages.map((m) => {
        const content = m.content as { type: string; text: string };
        return { role: m.role, content };
      }),
    };
  }

  async readResource(uri: string): Promise<McpResourceResult> {
    const result = await this.client.readResource({ uri });
    return {
      contents: result.contents.map((c) => ({
        uri: c.uri,
        text: 'text' in c ? c.text : undefined,
        blob: 'blob' in c ? c.blob : undefined,
        mimeType: c.mimeType,
      })),
    };
  }

  // --- Conversion ---

  async toPestTools(): Promise<ToolDefinition[]> {
    const tools = await this.listTools();
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
  }
}
