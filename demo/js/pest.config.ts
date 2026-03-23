import { defineConfig } from '@heilgar/pest-core';

export default defineConfig({
  providers: [
    { name: 'gpt4o-mini', type: 'openai', model: 'gpt-4o-mini' },
  ],

  // MCP servers — used by @heilgar/pest-mcp
  mcp: {
    servers: {
      acme: {
        command: 'npx',
        args: ['tsx', 'src/mcp-server.ts'],
      },
    },
  },
} as ReturnType<typeof defineConfig> & { mcp: unknown });
