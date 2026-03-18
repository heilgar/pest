// Client
export { McpClient } from './client.js';
export { useMcpServer, closeAllMcpServers, loadMcpConfig } from './config.js';
export type { McpConfig } from './config.js';

// LLM bridge
export { sendWithMcp } from './send-mcp.js';
export type { SendWithMcpOptions } from './send-mcp.js';

// Matchers
export { mcpMatchers } from './matchers.js';

// Types
export type {
  McpServerConfig,
  McpStdioServerConfig,
  McpSseServerConfig,
  McpHttpServerConfig,
  McpTool,
  McpToolResult,
  McpPrompt,
  McpPromptResult,
  McpResource,
  McpResourceResult,
} from './types.js';

// Type augmentations are in types-vitest.d.ts and types-jest.d.ts
// They are picked up automatically when this package is in the TypeScript path
