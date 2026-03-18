# MCP Testing — Design Spec

**Date:** 2026-03-17
**Status:** Draft
**Package:** `@heilgar/pest-mcp`

## Problem

Developers building MCP servers have no ergonomic way to test them. They need to verify:
1. The server starts, responds to protocol messages, and shuts down cleanly (server correctness).
2. An LLM can discover and use the server's tools in multi-turn conversations (end-to-end).

pest already handles LLM response testing. This spec adds MCP server testing as a new package that integrates with the existing matcher ecosystem.

## Goals

- Test MCP server installation and execution end-to-end.
- Test MCP server correctness: discovery, tool execution, schema validation, prompts, resources, error handling, lifecycle.
- Test LLM + MCP integration: multi-turn conversations where tool calls route to a real MCP server.
- Provide a CLI smoke test command (`pest qa --mcp <serverName>`) for quick validation.
- Keep the existing packages untouched — `@heilgar/pest-mcp` is a peer, not a dependency.

## Non-goals

- Custom MCP transports beyond stdio and SSE/HTTP.
- Testing MCP server notifications or subscriptions (v2 concern).
- MCP server scaffolding or code generation.

---

## Architecture

### New package: `packages/mcp/` (`@heilgar/pest-mcp`)

```
packages/mcp/
  src/
    index.ts              # public API exports
    types.ts              # McpServerConfig, McpToolResult, etc.
    client.ts             # McpClient class wrapping @modelcontextprotocol/sdk
    config.ts             # MCP config loading, valibot schema, useMcpServer()
    send-mcp.ts           # sendWithMcp() — auto-bridge LLM + MCP
    matchers.ts           # MCP-specific matcher logic (pure functions)
    setup-vitest.ts       # vitest expect.extend(mcpMatchers) entry point
    setup-jest.ts         # jest expect.extend(mcpMatchers) entry point
    types-vitest.d.ts     # vitest type augmentation
    types-jest.d.ts       # jest type augmentation
    qa.ts                 # smoke test logic (used by CLI)
  package.json
  tsconfig.json
  tsup.config.ts
```

### Dependency graph

```
@heilgar/pest-vitest  ──┐
@heilgar/pest-jest    ──┼──▶ @heilgar/pest-core
@heilgar/pest-playwright──┤
@heilgar/pest-mcp     ──┘
       │
       └──▶ @modelcontextprotocol/sdk
```

`pest-mcp` depends on `pest-core` (for `sendAgentic()`, types, config loader) and the official MCP SDK. It does NOT depend on pest-vitest/jest/playwright, and they do NOT depend on it. They are peers — users import both in their test setup.

### Dependencies

```json
{
  "dependencies": {
    "@heilgar/pest-core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.x"
  },
  "peerDependencies": {
    "vitest": ">=2.0.0",
    "jest": ">=29.0.0"
  },
  "peerDependenciesMeta": {
    "vitest": { "optional": true },
    "jest": { "optional": true }
  }
}
```

### Package exports map

```json
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./setup/vitest": { "import": "./dist/setup-vitest.js", "types": "./dist/setup-vitest.d.ts" },
    "./setup/jest": { "import": "./dist/setup-jest.js", "types": "./dist/setup-jest.d.ts" },
    "./qa": { "import": "./dist/qa.js", "types": "./dist/qa.d.ts" }
  }
}
```

---

## Configuration

MCP servers are defined in `pest.config.ts` under an `mcp.servers` field. The schema is owned by `@heilgar/pest-mcp`, not core.

```typescript
// pest.config.ts
import { defineConfig } from '@heilgar/pest-core';

export default defineConfig({
  providers: [
    { name: 'gpt4o-mini', type: 'openai', model: 'gpt-4o-mini' },
  ],

  // MCP section — parsed by @heilgar/pest-mcp, ignored by core
  mcp: {
    servers: {
      myServer: {
        command: 'npx',
        args: ['my-mcp-server', '--port', '3000'],
        env: { DEBUG: '1' },
      },
      remote: {
        transport: 'sse',
        url: 'http://localhost:3000/sse',
      },
    },
  },
});
```

### Config loading strategy

**Problem:** Core's `loadConfig()` uses `v.safeParse(PestConfigSchema, raw)` which strips unknown keys like `mcp` from the output.

**Solution:** `@heilgar/pest-mcp` loads the config file independently. It reuses core's `loadEnv()` for env vars and core's config file discovery logic, but imports the raw config module itself and parses only the `mcp` section with its own valibot schema. Core's config schema stays untouched.

Implementation in `config.ts`:

```typescript
import { loadEnv } from '@heilgar/pest-core';
import * as v from 'valibot';

// Reuse core's config file finding logic
const CONFIG_FILES = ['pest.config.ts', 'pest.config.js', 'pest.config.mjs'];

export async function loadMcpConfig(cwd?: string): Promise<McpConfig> {
  loadEnv(cwd);
  // Find and import the raw config file (same search as core)
  // Parse only the mcp section with McpConfigSchema
  // Return validated MCP config
}
```

### Config schema (valibot)

```typescript
const McpStdioServerSchema = v.object({
  command: v.string(),
  args: v.optional(v.array(v.string())),
  env: v.optional(v.record(v.string(), v.string())),
});

const McpSseServerSchema = v.object({
  transport: v.literal('sse'),
  url: v.string(),
});

const McpHttpServerSchema = v.object({
  transport: v.literal('http'),
  url: v.string(),
});

const McpServerConfigSchema = v.union([
  McpStdioServerSchema,
  McpSseServerSchema,
  McpHttpServerSchema,
]);

const McpConfigSchema = v.object({
  servers: v.record(v.string(), McpServerConfigSchema),
});
```

When `transport` is omitted, stdio is assumed (spawn child process). When `transport: 'sse'` or `transport: 'http'`, connect to the given URL.

---

## McpClient class

Wraps the `@modelcontextprotocol/sdk` Client. Manages lifecycle and exposes pest-friendly methods.

Named `McpClient` (not `McpServer`) to avoid collision with the MCP SDK's own `McpServer` class and to reflect that this is a client connection to a remote server.

```typescript
class McpClient {
  readonly name: string;

  // Factory — connects with a 30s default timeout
  static async fromConfig(
    name: string,
    config: McpServerConfig,
    options?: { timeout?: number },
  ): Promise<McpClient>;

  // Lifecycle
  async close(): Promise<void>;

  // Discovery
  async listTools(): Promise<McpTool[]>;
  async listPrompts(): Promise<McpPrompt[]>;
  async listResources(): Promise<McpResource[]>;

  // Execution
  async callTool(name: string, args?: Record<string, unknown>): Promise<McpToolResult>;
  async getPrompt(name: string, args?: Record<string, unknown>): Promise<McpPromptResult>;
  async readResource(uri: string): Promise<McpResourceResult>;

  // Conversion — MCP tools → pest ToolDefinition[]
  async toPestTools(): Promise<ToolDefinition[]>;
}
```

### Connection timeout

`McpClient.fromConfig()` accepts an optional `timeout` (default 30s). If the MCP server does not respond to the `initialize` handshake within this window, the connection fails with a clear error. This prevents tests from hanging on slow or broken servers.

### Type mappings

MCP SDK types are mapped to pest-friendly types:

```typescript
// Tool discovery — includes the JSON Schema for validation
interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>; // JSON Schema
}

// Tool result
interface McpToolResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

// Prompt
interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

// Prompt result
interface McpPromptResult {
  messages: Array<{ role: string; content: { type: string; text: string } }>;
}

// Resource
interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// Resource result
interface McpResourceResult {
  contents: Array<{ uri: string; text?: string; blob?: string; mimeType?: string }>;
}
```

### Tool definition conversion

`toPestTools()` maps each MCP tool's `name`, `description`, and `inputSchema` to pest's `{ type: 'function', function: { name, description, parameters } }` format. This is the bridge that lets `sendWithMcp()` pass MCP tools to `sendAgentic()`.

---

## useMcpServer()

Resolves an MCP server from config, connects, and returns an `McpClient` instance. Caches connections so multiple calls in the same test suite reuse the same server process.

```typescript
async function useMcpServer(name: string): Promise<McpClient>;
```

Internally:
1. Calls `loadMcpConfig()` (pest-mcp's own config loader).
2. Reads the `mcp.servers[name]` entry.
3. Creates `McpClient.fromConfig(name, config)`.
4. Caches by name — second call returns the same instance.
5. Registers a `process.on('beforeExit')` handler as best-effort cleanup.

### Explicit cleanup

For reliable cleanup, provide `closeAllMcpServers()`:

```typescript
export async function closeAllMcpServers(): Promise<void>;
```

Documented usage in `afterAll()`:

```typescript
import { closeAllMcpServers } from '@heilgar/pest-mcp';

afterAll(async () => {
  await closeAllMcpServers();
});
```

The `beforeExit` handler remains as a fallback for cases where users forget `afterAll`, but `afterAll` is the recommended pattern.

---

## sendWithMcp()

Auto-bridge that connects an LLM provider to an MCP server for multi-turn tool-calling tests. Internally uses `sendAgentic()` from core.

```typescript
import type { SendAgenticOptions } from '@heilgar/pest-core';

interface SendWithMcpOptions extends Omit<SendAgenticOptions, 'executor' | 'tools'> {
  mcpServer: McpClient;
  additionalTools?: ToolDefinition[];
}

async function sendWithMcp(
  provider: Provider,
  message: string,
  options: SendWithMcpOptions,
): Promise<PestResponse>;
```

`SendWithMcpOptions` extends `SendAgenticOptions` (minus `executor` and `tools` which are wired internally) to stay in sync with core. It adds:
- `mcpServer` — the MCP client to route tool calls to.
- `additionalTools` — optional extra non-MCP tools for hybrid setups.

Implementation:
1. Calls `mcpServer.toPestTools()` to get tool definitions.
2. Merges with `additionalTools` if provided.
3. Calls `sendAgentic(provider, message, { tools, executor, ...rest })`.
4. The `executor` routes each tool call to `mcpServer.callTool(name, args)` and returns the text content. Non-MCP tool calls (from `additionalTools`) fall through to a no-op or user-provided executor.
5. Returns the standard `PestResponse` with all accumulated tool calls.

This means all existing pest matchers (`toContainToolCall`, `toCallToolsInOrder`, etc.) work on the result.

---

## MCP-specific matchers

These matchers operate on `McpClient` instances and test server correctness directly (no LLM involved). All matchers are async because they make MCP protocol calls.

### Discovery matchers

| Matcher | Signature | Description |
|---------|-----------|-------------|
| `toExposeTools` | `(names: string[])` | Server lists all expected tool names (subset match) |
| `toExposeTool` | `(name: string)` | Server lists a specific tool |
| `toExposePrompts` | `(names: string[])` | Server lists all expected prompt names |
| `toExposeResources` | `(uris: string[])` | Server lists all expected resource URIs |
| `toHaveValidToolSchemas` | `()` | All tool `inputSchema` values are valid JSON Schema |

### Direct tool testing

Side-effect matchers (like "call this tool and check the result") are deliberately excluded. Tool execution is an action, not an assertion. Users call `server.callTool()` directly and assert on the result:

```typescript
const result = await server.callTool('search', { query: 'pest' });
expect(result.isError).not.toBe(true);
expect(result.content[0]?.text).toContain('pest');
```

For LLM-judged assertions on tool results, use `sendWithMcp()` — the LLM processes the tool output and the response can be judged with existing pest matchers.

### Type augmentation

Separate declaration files for vitest and jest:

```typescript
// types-vitest.d.ts
declare module 'vitest' {
  interface Assertion<T> {
    toExposeTools(names: string[]): Promise<void>;
    toExposeTool(name: string): Promise<void>;
    toExposePrompts(names: string[]): Promise<void>;
    toExposeResources(uris: string[]): Promise<void>;
    toHaveValidToolSchemas(): Promise<void>;
  }
}

// types-jest.d.ts
declare global {
  namespace jest {
    interface Matchers<R> {
      toExposeTools(names: string[]): Promise<R>;
      toExposeTool(name: string): Promise<R>;
      toExposePrompts(names: string[]): Promise<R>;
      toExposeResources(uris: string[]): Promise<R>;
      toHaveValidToolSchemas(): Promise<R>;
    }
  }
}
```

### Registration

```typescript
// vitest.setup.ts
import '@heilgar/pest-vitest/setup';
import '@heilgar/pest-mcp/setup/vitest';

// jest.setup.ts
import '@heilgar/pest-jest/setup';  // or manual expect.extend
import '@heilgar/pest-mcp/setup/jest';
```

Separate setup entry points for vitest and jest, following the pattern of pest-vitest and pest-jest being separate packages. The vitest setup imports `expect` from `vitest`; the jest setup uses the jest global.

---

## CLI: `pest qa --mcp <serverName>`

A built-in smoke test that validates an MCP server without writing test files. Reads server config from `pest.config.ts`.

### Usage

```bash
pest qa --mcp myServer
pest qa --mcp myServer --verbose
```

### Checklist it runs

1. **Lifecycle** — server starts and connects successfully (with 30s timeout).
2. **Discovery** — `tools/list` responds; log tool count and names.
3. **Schema validation** — all tool input schemas are valid JSON Schema.
4. **Prompts** — if server exposes prompts, list them.
5. **Resources** — if server exposes resources, list and attempt to read one.
6. **Shutdown** — server closes cleanly.

Tool execution with empty args is excluded from the default QA run because most tools require arguments and the noise-to-signal ratio is poor. Users test individual tool execution in test files where they provide meaningful args.

### Output

```
pest qa — myServer (npx my-mcp-server)

  [pass] Server started and connected via stdio (1.2s)
  [pass] tools/list: 3 tools (search_flights, book_flight, get_status)
  [pass] Tool schemas valid
  [pass] prompts/list: 1 prompt (summarize)
  [pass] resources/list: 0 resources
  [pass] Server closed cleanly

  Result: 6 passed, 0 failed
```

### Implementation

The `qa` logic lives in `packages/mcp/src/qa.ts` and is imported by `packages/cli/src/cli.ts`. The CLI adds a new `qa` subcommand:

```typescript
const qaCommand = defineCommand({
  meta: { description: 'Run QA checks on an MCP server' },
  args: {
    mcp: { type: 'string', description: 'MCP server name from pest.config.ts', required: true },
    verbose: { type: 'boolean', alias: 'v', description: 'Show detailed output' },
  },
  async run({ args }) {
    const { runMcpQa } = await import('@heilgar/pest-mcp/qa');
    await runMcpQa(args.mcp, { verbose: args.verbose });
  },
});
```

The CLI dynamically imports `@heilgar/pest-mcp` so it's not a hard dependency — if the package isn't installed, the CLI prints a helpful error.

---

## User experience

### Setup

```bash
npm install -D @heilgar/pest-mcp
```

```typescript
// pest.config.ts
export default defineConfig({
  providers: [
    { name: 'gpt4o-mini', type: 'openai', model: 'gpt-4o-mini' },
  ],
  mcp: {
    servers: {
      travel: { command: 'npx', args: ['travel-mcp-server'] },
    },
  },
});
```

```typescript
// vitest.setup.ts
import '@heilgar/pest-vitest/setup';
import '@heilgar/pest-mcp/setup/vitest';
```

### Test file example

```typescript
import { describe, test, expect, afterAll } from 'vitest';
import { useMcpServer, sendWithMcp, closeAllMcpServers } from '@heilgar/pest-mcp';
import { useProvider } from '@heilgar/pest-core';

const server = await useMcpServer('travel');
const provider = await useProvider('gpt4o-mini');

afterAll(async () => {
  await closeAllMcpServers();
});

describe('travel MCP server — correctness', () => {
  test('exposes expected tools', async () => {
    await expect(server).toExposeTools(['search_flights', 'book_flight']);
  });

  test('tool schemas are valid', async () => {
    await expect(server).toHaveValidToolSchemas();
  });

  test('search_flights returns results', async () => {
    const result = await server.callTool('search_flights', {
      origin: 'NYC',
      destination: 'Paris',
    });
    expect(result.isError).not.toBe(true);
    expect(result.content[0]?.text).toContain('Paris');
  });

  test('invalid tool returns error', async () => {
    await expect(
      server.callTool('nonexistent_tool', {}),
    ).rejects.toThrow();
  });

  test('lists prompts', async () => {
    await expect(server).toExposePrompts(['summarize_itinerary']);
  });
});

describe('travel MCP server — LLM end-to-end', () => {
  test('agent uses search tool for travel queries', async () => {
    const res = await sendWithMcp(provider, 'Find flights to Paris', {
      mcpServer: server,
      systemPrompt: 'You are a travel assistant. Use tools to help the user.',
    });

    expect(res).toContainToolCall('search_flights');
  });

  test('multi-turn: agent searches then books', async () => {
    const res = await sendWithMcp(
      provider,
      'Find flights to Paris and book the cheapest one',
      {
        mcpServer: server,
        systemPrompt: 'You are a travel assistant. Use tools to help the user.',
      },
    );

    expect(res).toCallToolsInOrder(['search_flights', 'book_flight']);
  });

  test('agent responds politely when no flights found', async () => {
    const res = await sendWithMcp(
      provider,
      'Find flights to the moon',
      {
        mcpServer: server,
        systemPrompt: 'You are a travel assistant. Be helpful even when results are empty.',
      },
    );

    await expect(res).toSatisfyCriteria(
      'Response politely explains no results were found',
    );
  });
});
```

### CLI smoke test

```bash
pest qa --mcp travel
```

---

## Exports

### `@heilgar/pest-mcp` (main entry)

```typescript
// Client
export { McpClient } from './client.js';
export { useMcpServer, closeAllMcpServers } from './config.js';

// LLM bridge
export { sendWithMcp } from './send-mcp.js';
export type { SendWithMcpOptions } from './send-mcp.js';

// Matchers
export { mcpMatchers } from './matchers.js';

// Types
export type {
  McpServerConfig,
  McpTool,
  McpToolResult,
  McpPrompt,
  McpPromptResult,
  McpResource,
  McpResourceResult,
} from './types.js';
```

### `@heilgar/pest-mcp/setup/vitest`

```typescript
import { expect } from 'vitest';
import { mcpMatchers } from '../matchers.js';
expect.extend(mcpMatchers);
```

### `@heilgar/pest-mcp/setup/jest`

```typescript
import { mcpMatchers } from '../matchers.js';
expect.extend(mcpMatchers as Record<string, unknown>);
```

### `@heilgar/pest-mcp/qa`

```typescript
export { runMcpQa } from './qa.js';
```

---

## What changes in existing packages

### `@heilgar/pest-core`

**Nothing.** Core's config schema stays unchanged. `@heilgar/pest-mcp` loads the raw config file independently to read the `mcp` section, reusing core's `loadEnv()` for env vars.

### `@heilgar/pest-cli`

Adds a `qa` subcommand that dynamically imports `@heilgar/pest-mcp/qa`. If the import fails (package not installed), prints:

```
pest qa --mcp requires @heilgar/pest-mcp. Install it:
  npm install -D @heilgar/pest-mcp
```

### `@heilgar/pest-vitest`, `@heilgar/pest-jest`, `@heilgar/pest-playwright`

**Nothing.** They remain peers.

---

## Testing strategy

### Unit tests (in `packages/mcp/tests/unit/`)

- Config parsing (valid/invalid schemas).
- MCP → pest tool definition conversion.
- Matcher logic with mock `McpClient` instances.

### Integration tests (in demo or `packages/mcp/tests/integration/`)

- Spawn a minimal test MCP server (a simple script bundled in tests).
- Verify full lifecycle: connect, list tools, call tool, close.
- `sendWithMcp()` with a real LLM provider and the test server.

### CLI tests

- `pest qa --mcp` against the test server.

---

## Implementation order

1. `types.ts` — MCP type definitions.
2. `config.ts` — valibot schema, `loadMcpConfig()`, `useMcpServer()`, `closeAllMcpServers()`.
3. `client.ts` — `McpClient` class (stdio + SSE/HTTP transports, connection timeout).
4. `matchers.ts` — MCP-specific matcher logic (pure async functions).
5. `setup-vitest.ts` + `setup-jest.ts` — framework-specific `expect.extend()` entry points.
6. `types-vitest.d.ts` + `types-jest.d.ts` — type augmentations.
7. `send-mcp.ts` — `sendWithMcp()` bridge.
8. `qa.ts` — smoke test logic.
9. CLI integration — add `qa` subcommand to `pest-cli`.
10. Unit tests for each module.
11. Integration tests with a test MCP server.
12. Documentation updates (packages.md, api.md, cli.md, new extensions/mcp.md).
