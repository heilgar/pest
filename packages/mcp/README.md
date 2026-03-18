# @heilgar/pest-mcp

MCP (Model Context Protocol) server testing for **pest** (Prompt Evaluation & Scoring Toolkit) — test your MCP servers with tool discovery, execution validation, and LLM-driven end-to-end scenarios.

## Features

- **MCP tool discovery testing** — verify your server exposes the expected tools, resources, and prompts
- **Tool execution validation** — call MCP tools and assert on their responses with deterministic matchers
- **LLM + MCP end-to-end tests** — send prompts to an LLM with your MCP server connected, verify the LLM calls the right tools
- **QA generation** — automatically generate test cases for your MCP server using an LLM
- **Works with Vitest and Jest** — setup files for both test frameworks

## Install

```bash
npm install @heilgar/pest-mcp @heilgar/pest-core
```

## Quick Start

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['@heilgar/pest-mcp/setup/vitest'],
  },
});
```

```typescript
// tests/mcp-server.test.ts
import { describe, test, expect } from 'vitest';
import { createMcpClient } from '@heilgar/pest-mcp';

describe('My MCP Server', () => {
  test('exposes expected tools', async () => {
    const client = await createMcpClient({ command: 'node', args: ['./dist/server.js'] });
    const tools = await client.listTools();
    expect(tools).toContainEqual(expect.objectContaining({ name: 'search' }));
  });
});
```

## Documentation

Full docs at [heilgar.github.io/pest](https://heilgar.github.io/pest/)

## License

MIT
