import { ansi as c } from '@heilgar/pest-core';
import { McpClient } from './client.js';
import { loadMcpConfig } from './config.js';

interface QaOptions {
  verbose?: boolean;
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

function icon(status: CheckResult['status']): string {
  if (status === 'pass') return `${c.green}pass${c.reset}`;
  if (status === 'fail') return `${c.red}fail${c.reset}`;
  return `${c.yellow}warn${c.reset}`;
}

export async function runMcpQa(serverName: string, options?: QaOptions): Promise<void> {
  const config = await loadMcpConfig();
  const serverConfig = config.servers[serverName];
  if (!serverConfig) {
    console.error(
      `MCP server "${serverName}" not found in pest.config.ts. Available: ${Object.keys(config.servers).join(', ')}`,
    );
    process.exit(1);
  }

  const command = 'command' in serverConfig
    ? `${serverConfig.command} ${(serverConfig.args ?? []).join(' ')}`.trim()
    : serverConfig.url;

  console.log(`\npest qa — ${serverName} (${command})\n`);

  const results: CheckResult[] = [];

  // 1. Lifecycle — connect
  let client: McpClient;
  try {
    const start = performance.now();
    client = await McpClient.fromConfig(serverName, serverConfig);
    const elapsed = ((performance.now() - start) / 1000).toFixed(1);
    const transport = 'command' in serverConfig ? 'stdio' : serverConfig.transport;
    results.push({ status: 'pass', message: `Server started and connected via ${transport} (${elapsed}s)` });
  } catch (err) {
    results.push({ status: 'fail', message: `Server failed to start: ${err}` });
    for (const r of results) console.log(`  [${icon(r.status)}] ${r.message}`);
    console.log(`\n  Result: 0 passed, 1 failed\n`);
    process.exit(1);
    return;
  }

  try {
    // 2. Discovery — tools
    try {
      const tools = await client.listTools();
      const names = tools.map((t) => t.name).join(', ');
      results.push({ status: 'pass', message: `tools/list: ${tools.length} tools (${names})` });

      // 3. Schema validation
      const invalid = tools.filter((t) => !t.inputSchema || t.inputSchema.type !== 'object');
      if (invalid.length === 0) {
        results.push({ status: 'pass', message: 'Tool schemas valid' });
      } else {
        results.push({
          status: 'fail',
          message: `Invalid tool schemas: ${invalid.map((t) => t.name).join(', ')}`,
        });
      }
    } catch (err) {
      results.push({ status: 'fail', message: `tools/list failed: ${err}` });
    }

    // 4. Prompts
    try {
      const prompts = await client.listPrompts();
      const names = prompts.map((p) => p.name).join(', ');
      results.push({ status: 'pass', message: `prompts/list: ${prompts.length} prompts${prompts.length > 0 ? ` (${names})` : ''}` });
    } catch (err) {
      results.push({ status: 'warn', message: `prompts/list: ${err}` });
    }

    // 5. Resources
    try {
      const resources = await client.listResources();
      results.push({ status: 'pass', message: `resources/list: ${resources.length} resources` });

      if (resources.length > 0 && options?.verbose) {
        try {
          const first = resources[0]!;
          await client.readResource(first.uri);
          results.push({ status: 'pass', message: `resources/read: ${first.uri} readable` });
        } catch (err) {
          results.push({ status: 'warn', message: `resources/read failed: ${err}` });
        }
      }
    } catch (err) {
      results.push({ status: 'warn', message: `resources/list: ${err}` });
    }

    // 6. Shutdown
    await client.close();
    results.push({ status: 'pass', message: 'Server closed cleanly' });
  } catch (err) {
    results.push({ status: 'fail', message: `Unexpected error: ${err}` });
    try { await client.close(); } catch { /* ignore */ }
  }

  // Output
  for (const r of results) {
    console.log(`  [${icon(r.status)}] ${r.message}`);
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;

  console.log('');
  const parts = [`${passed} passed`, `${failed} failed`];
  if (warned > 0) parts.push(`${warned} warnings`);
  console.log(`  Result: ${parts.join(', ')}\n`);

  if (failed > 0) process.exit(1);
}
