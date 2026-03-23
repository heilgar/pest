import { loadConfig } from '@heilgar/pest-core';
import { McpClient } from './client.js';
import type { McpServerConfig } from './types.js';

export interface McpConfig {
  servers: Record<string, McpServerConfig>;
}

/**
 * Load the MCP config section from pest.config.ts via core's loadConfig().
 * The `mcp` field is now part of PestConfigSchema so no keys are stripped.
 */
export async function loadMcpConfig(cwd: string = process.cwd()): Promise<McpConfig> {
  const config = await loadConfig(cwd);

  if (!config.mcp) {
    throw new Error(
      'No "mcp" section found in pest config. Add mcp.servers to your config.',
    );
  }

  return config.mcp as McpConfig;
}

// --- Connection cache ---

const cache = new Map<string, McpClient>();

/**
 * Resolve an MCP server from pest.config.ts by name.
 * Cached — subsequent calls return the same connection.
 */
export async function useMcpServer(name: string): Promise<McpClient> {
  const cached = cache.get(name);
  if (cached) return cached;

  const config = await loadMcpConfig();
  const serverConfig = config.servers[name];
  if (!serverConfig) {
    throw new Error(
      `MCP server "${name}" not found in pest.config.ts. Available: ${Object.keys(config.servers).join(', ')}`,
    );
  }

  const client = await McpClient.fromConfig(name, serverConfig);
  cache.set(name, client);
  return client;
}

/**
 * Close all cached MCP connections.
 * Call in afterAll() for reliable cleanup.
 */
export async function closeAllMcpServers(): Promise<void> {
  const clients = [...cache.values()];
  cache.clear();
  await Promise.allSettled(clients.map((c) => c.close()));
}

// Best-effort cleanup on exit
process.on('beforeExit', () => {
  if (cache.size > 0) {
    closeAllMcpServers().catch(() => {});
  }
});
