import type { McpClient } from './client.js';

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

async function toExposeTools(received: McpClient, names: string[]): Promise<MatcherResult> {
  const tools = await received.listTools();
  const toolNames = tools.map((t) => t.name);
  const missing = names.filter((n) => !toolNames.includes(n));
  const pass = missing.length === 0;

  return {
    pass,
    message: () =>
      pass
        ? `Expected server NOT to expose tools [${names.join(', ')}], but it does.`
        : `Expected server to expose tools [${names.join(', ')}], but missing: [${missing.join(', ')}]. Found: [${toolNames.join(', ')}]`,
  };
}

async function toExposeTool(received: McpClient, name: string): Promise<MatcherResult> {
  const tools = await received.listTools();
  const toolNames = tools.map((t) => t.name);
  const pass = toolNames.includes(name);

  return {
    pass,
    message: () =>
      pass
        ? `Expected server NOT to expose tool "${name}", but it does.`
        : `Expected server to expose tool "${name}". Found: [${toolNames.join(', ')}]`,
  };
}

async function toHaveValidToolSchemas(received: McpClient): Promise<MatcherResult> {
  const tools = await received.listTools();
  const invalid: string[] = [];

  for (const tool of tools) {
    const schema = tool.inputSchema;
    if (!schema || typeof schema !== 'object' || schema.type !== 'object') {
      invalid.push(tool.name);
    }
  }

  const pass = invalid.length === 0;
  return {
    pass,
    message: () =>
      pass
        ? 'Expected tool schemas NOT to be valid, but they are.'
        : `Expected all tool schemas to be valid JSON Schema objects. Invalid: [${invalid.join(', ')}]`,
  };
}

async function toExposePrompts(received: McpClient, names: string[]): Promise<MatcherResult> {
  const prompts = await received.listPrompts();
  const promptNames = prompts.map((p) => p.name);
  const missing = names.filter((n) => !promptNames.includes(n));
  const pass = missing.length === 0;

  return {
    pass,
    message: () =>
      pass
        ? `Expected server NOT to expose prompts [${names.join(', ')}], but it does.`
        : `Expected server to expose prompts [${names.join(', ')}], but missing: [${missing.join(', ')}]. Found: [${promptNames.join(', ')}]`,
  };
}

async function toExposeResources(received: McpClient, uris: string[]): Promise<MatcherResult> {
  const resources = await received.listResources();
  const resourceUris = resources.map((r) => r.uri);
  const missing = uris.filter((u) => !resourceUris.includes(u));
  const pass = missing.length === 0;

  return {
    pass,
    message: () =>
      pass
        ? `Expected server NOT to expose resources [${uris.join(', ')}], but it does.`
        : `Expected server to expose resources [${uris.join(', ')}], but missing: [${missing.join(', ')}]. Found: [${resourceUris.join(', ')}]`,
  };
}

export const mcpMatchers = {
  async toExposeTools(received: McpClient, names: string[]) {
    return toExposeTools(received, names);
  },
  async toExposeTool(received: McpClient, name: string) {
    return toExposeTool(received, name);
  },
  async toHaveValidToolSchemas(received: McpClient) {
    return toHaveValidToolSchemas(received);
  },
  async toExposePrompts(received: McpClient, names: string[]) {
    return toExposePrompts(received, names);
  },
  async toExposeResources(received: McpClient, uris: string[]) {
    return toExposeResources(received, uris);
  },
};
