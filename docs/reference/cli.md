# CLI Reference

The pest CLI (`@heilgar/pest-cli`) provides project setup and QA tools.

## Installation

```bash
npm install -D @heilgar/pest-cli
```

## Commands

### `pest install`

Install Claude Code agents and skills for pest into your project.

```bash
pest install [--force]
```

Creates:
- `.claude/agents/pest-test-writer.md` — agent for writing pest tests (unit + integration patterns, all matchers documented)
- `.claude/agents/pest-test-healer.md` — agent for debugging failing pest tests
- `.claude/skills/pest-test.md` — skill for generating pest tests from system prompts

| Option | Alias | Description |
|---|---|---|
| `--force` | `-f` | Overwrite existing files |

Example:

```bash
# First install
pest install

# Re-install (overwrite existing)
pest install --force
```

### `pest qa --mcp <server>`

Run smoke tests against an MCP server defined in `pest.config.ts`. Requires `@heilgar/pest-mcp`.

```bash
pest qa --mcp myServer
pest qa --mcp myServer --verbose
```

Validates: server startup, tool discovery, schema validity, prompts, resources, clean shutdown.

| Option | Alias | Description |
|---|---|---|
| `--mcp` | | MCP server name from pest.config.ts (required) |
| `--verbose` | `-v` | Show detailed output |

Example output:

```
pest qa — myServer (npx my-mcp-server)

  [pass] Server started and connected via stdio (1.2s)
  [pass] tools/list: 3 tools (search, create, delete)
  [pass] Tool schemas valid
  [pass] prompts/list: 1 prompt (summarize)
  [pass] resources/list: 0 resources
  [pass] Server closed cleanly

  Result: 6 passed, 0 failed
```

See [MCP Extension](/extensions/mcp) for full MCP testing docs.

## Running tests

pest does not have its own test runner. Use vitest or jest directly:

```bash
# Run all tests
vitest run

# Run specific test file
vitest run tests/my-agent.test.ts

# Watch mode
vitest
```

The pest vitest/jest reporters handle all output — per-test metrics, token costs, JSON logs, and HTML reports. See [Reporters](/reference/reporters) for configuration.
