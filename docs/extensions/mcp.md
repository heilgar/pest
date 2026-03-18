# MCP Extension

`@heilgar/pest-mcp` adds MCP (Model Context Protocol) server testing to pest. Test server correctness (discovery, tools, prompts, resources) and LLM+MCP end-to-end conversations.

## Setup

```bash
npm install -D @heilgar/pest-mcp
```

### Configuration

Define MCP servers in `pest.config.ts`:

```ts
import { defineConfig } from '@heilgar/pest-core';

export default defineConfig({
  providers: [
    { name: 'gpt4o-mini', type: 'openai', model: 'gpt-4o-mini' },
  ],
  mcp: {
    servers: {
      // stdio: pest spawns and manages the process
      myServer: {
        command: 'npx',
        args: ['my-mcp-server'],
        env: { DEBUG: '1' },
      },
      // SSE: connect to a running server
      remote: {
        transport: 'sse',
        url: 'http://localhost:3000/sse',
      },
      // HTTP (Streamable HTTP transport)
      httpServer: {
        transport: 'http',
        url: 'http://localhost:3000/mcp',
      },
      // HTTP with authentication headers
      authenticated: {
        transport: 'http',
        url: 'http://localhost:3000/mcp',
        headers: {
          Authorization: `Bearer ${process.env.MCP_TOKEN}`,
        },
      },
    },
  },
});
```

### Register matchers

```ts
// vitest.setup.ts
import '@heilgar/pest-vitest/setup';
import '@heilgar/pest-mcp/setup/vitest';
```

```ts
// jest.setup.ts (or inline)
import '@heilgar/pest-mcp/setup/jest';
```

## Server correctness tests

Test that your MCP server exposes the right tools, prompts, and resources:

```ts
import { describe, test, expect, afterAll } from 'vitest';
import { useMcpServer, closeAllMcpServers } from '@heilgar/pest-mcp';

const server = await useMcpServer('myServer');

afterAll(async () => {
  await closeAllMcpServers();
});

describe('server correctness', () => {
  test('exposes expected tools', async () => {
    await expect(server).toExposeTools(['search', 'create']);
  });

  test('exposes a specific tool', async () => {
    await expect(server).toExposeTool('search');
  });

  test('tool schemas are valid JSON Schema', async () => {
    await expect(server).toHaveValidToolSchemas();
  });

  test('lists prompts', async () => {
    await expect(server).toExposePrompts(['summarize']);
  });

  test('lists resources', async () => {
    await expect(server).toExposeResources(['config://app']);
  });
});
```

### Direct tool execution

Call tools directly and assert on results:

```ts
test('search returns results', async () => {
  const result = await server.callTool('search', { query: 'pest' });
  expect(result.isError).not.toBe(true);
  expect(result.content[0]?.text).toContain('pest');
});

test('invalid tool throws', async () => {
  await expect(server.callTool('nonexistent', {})).rejects.toThrow();
});
```

### Prompts and resources

```ts
test('get prompt messages', async () => {
  const result = await server.getPrompt('summarize', { text: 'Hello world' });
  expect(result.messages).toHaveLength(1);
});

test('read resource', async () => {
  const result = await server.readResource('config://app');
  expect(result.contents[0]?.text).toBeDefined();
});
```

## LLM + MCP end-to-end tests

Use `sendWithMcp()` to have an LLM discover and use your MCP server's tools in multi-turn conversations:

```ts
import { sendWithMcp, useMcpServer } from '@heilgar/pest-mcp';
import { useProvider } from '@heilgar/pest-core';

const server = await useMcpServer('myServer');
const provider = await useProvider('gpt4o-mini');

test('agent uses search tool', async () => {
  const res = await sendWithMcp(provider, 'Find flights to Paris', {
    mcpServer: server,
    systemPrompt: 'You are a travel assistant.',
  });

  expect(res).toContainToolCall('search_flights');
});

test('multi-turn tool sequence', async () => {
  const res = await sendWithMcp(
    provider,
    'Find flights to Paris and book the cheapest one',
    {
      mcpServer: server,
      systemPrompt: 'You are a travel assistant.',
    },
  );

  expect(res).toCallToolsInOrder(['search_flights', 'book_flight']);
});
```

`sendWithMcp()` returns a standard `PestResponse`, so all existing pest matchers work — including LLM-judged matchers like `toSatisfyCriteria()` and `toNotDisclose()`.

## MCP matchers reference

| Matcher | Description |
|---------|-------------|
| `toExposeTools(names)` | Server lists all expected tool names (subset match) |
| `toExposeTool(name)` | Server lists a specific tool |
| `toExposePrompts(names)` | Server lists all expected prompt names |
| `toExposeResources(uris)` | Server lists all expected resource URIs |
| `toHaveValidToolSchemas()` | All tool input schemas are valid JSON Schema |

All matchers are async.

## CLI smoke test

Quick-check an MCP server without writing tests:

```bash
pest qa --mcp myServer
pest qa --mcp myServer --verbose
```

Validates: server startup, tool discovery, schema validity, prompts, resources, clean shutdown.

## API

### `useMcpServer(name)`

Connect to an MCP server defined in `pest.config.ts`. Returns an `McpClient` instance. Cached — multiple calls return the same connection.

### `closeAllMcpServers()`

Close all cached MCP connections. Call in `afterAll()` for reliable cleanup.

### `sendWithMcp(provider, message, options)`

Send a message to an LLM with MCP server tools auto-discovered and tool calls auto-routed to the MCP server. Uses `sendAgentic()` internally.

Options extend `SendAgenticOptions` (minus `executor`/`tools`):

| Option | Type | Description |
|--------|------|-------------|
| `mcpServer` | `McpClient` | Required. The MCP server to use |
| `systemPrompt` | `string` | System prompt for the LLM |
| `additionalTools` | `ToolDefinition[]` | Extra non-MCP tools |
| `temperature` | `number` | LLM temperature |
| `maxTokens` | `number` | Max output tokens |
| `maxSteps` | `number` | Max agentic loop iterations (default: 10) |

### `McpClient`

| Method | Returns | Description |
|--------|---------|-------------|
| `listTools()` | `McpTool[]` | List all tools the server exposes |
| `listPrompts()` | `McpPrompt[]` | List all prompts |
| `listResources()` | `McpResource[]` | List all resources |
| `callTool(name, args?)` | `McpToolResult` | Execute a tool |
| `getPrompt(name, args?)` | `McpPromptResult` | Get prompt messages |
| `readResource(uri)` | `McpResourceResult` | Read a resource |
| `toPestTools()` | `ToolDefinition[]` | Convert MCP tools to pest format |
| `close()` | `void` | Disconnect from server |
