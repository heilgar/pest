import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from '@heilgar/pest-core';
import * as v from 'valibot';
import { McpClient } from './client.js';
import type { McpServerConfig } from './types.js';

const CONFIG_FILES = ['pest.config.ts', 'pest.config.js', 'pest.config.mjs'];

const McpStdioServerSchema = v.object({
  command: v.string(),
  args: v.optional(v.array(v.string())),
  env: v.optional(v.record(v.string(), v.string())),
});

const McpSseServerSchema = v.object({
  transport: v.literal('sse'),
  url: v.string(),
  headers: v.optional(v.record(v.string(), v.string())),
});

const McpHttpServerSchema = v.object({
  transport: v.literal('http'),
  url: v.string(),
  headers: v.optional(v.record(v.string(), v.string())),
});

const McpServerConfigSchema = v.union([
  McpStdioServerSchema,
  McpSseServerSchema,
  McpHttpServerSchema,
]);

const McpConfigSchema = v.object({
  servers: v.record(v.string(), McpServerConfigSchema),
});

export interface McpConfig {
  servers: Record<string, McpServerConfig>;
}

/**
 * Load the MCP config section from pest.config.ts.
 * Loads the raw config file independently from core's loadConfig()
 * because core's valibot schema strips unknown keys.
 */
export async function loadMcpConfig(cwd: string = process.cwd()): Promise<McpConfig> {
  loadEnv(cwd);

  let configPath: string | undefined;
  for (const file of CONFIG_FILES) {
    const candidate = resolve(cwd, file);
    if (existsSync(candidate)) {
      configPath = candidate;
      break;
    }
  }

  if (!configPath) {
    throw new Error(
      `No pest config found. Create one of: ${CONFIG_FILES.join(', ')}`,
    );
  }

  const configUrl = pathToFileURL(configPath).href;
  let mod: Record<string, unknown>;
  try {
    mod = await import(configUrl);
  } catch (err) {
    if (
      configPath.endsWith('.ts') &&
      (err as NodeJS.ErrnoException).code === 'ERR_UNKNOWN_FILE_EXTENSION'
    ) {
      throw new Error(
        `Cannot import TypeScript config "${configPath}".\n` +
          'Run with tsx (npx tsx ...) or use pest.config.js / pest.config.mjs instead.',
      );
    }
    throw err;
  }

  const raw = (mod.default ?? mod) as Record<string, unknown>;
  const mcpRaw = raw.mcp;

  if (!mcpRaw) {
    throw new Error(
      'No "mcp" section found in pest config. Add mcp.servers to pest.config.ts.',
    );
  }

  const result = v.safeParse(McpConfigSchema, mcpRaw);
  if (!result.success) {
    const issues = v.flatten(result.issues);
    const messages = Object.entries(issues.nested ?? {})
      .map(([path, errors]) => `  ${path}: ${(errors ?? []).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid MCP config:\n${messages}`);
  }

  return result.output;
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
