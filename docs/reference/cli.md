# CLI Reference

The pest CLI (`@heilgar/pest-cli`) provides project setup, QA tools, and a JSON protocol bridge for cross-language integrations.

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

### `pest eval [files...]`

Run multi-model evaluation suites. Discovers `*.eval.ts` files and runs each case against configured providers, producing comparison results.

```bash
pest eval
pest eval ./eval/customer-support.eval.ts
pest eval --provider gpt4o,claude-sonnet
pest eval --html eval-report.html --json eval-results.json
```

| Option | Alias | Description |
|---|---|---|
| `files` | | Eval suite file path (default: discovers all `*.eval.ts`) |
| `--provider` | `-p` | Filter to specific provider(s), comma-separated |
| `--json` | | Write JSON results to path |
| `--html` | | Write HTML comparison report to path |
| `--config` | `-c` | Path to pest config file (default: auto-detected) |
| `--verbose` | `-v` | Show detailed output |

Example output:

```
pest eval - customer-support (5 cases, 3 providers)

  Provider             Score    Pass     Latency      Cost
  ----------------------------------------------------------
  gpt4o                0.87     9/10     1.2s avg     $0.0300
  claude-sonnet        0.92     10/10    1.8s avg     $0.0400
  gemini-flash         0.81     8/10     0.6s avg     $0.0100
```

The command returns exit code 1 if any provider scores below 0.5, making it suitable for CI pipelines.

See [Multi-Model Eval](/guide/eval) for the full guide on writing eval suites.

### `pest exec`

Execute pest operations via a JSON protocol over stdin/stdout. This is the bridge used by non-JavaScript integrations (e.g. [PHPUnit](/extensions/phpunit)) to access pest's core functionality.

```bash
echo '{"method":"send","params":{...}}' | pest exec [--config <path>]
```

| Option | Alias | Description |
|---|---|---|
| `--config` | `-c` | Path to pest config file (default: auto-detected) |

The command reads a JSON request from stdin, executes the operation, and writes a JSON response to stdout. All console output is suppressed during execution to keep stdout clean.

**Methods:**

| Method | Description |
|---|---|
| `send` | Single-turn LLM call |
| `sendWithMcp` | MCP-backed agentic call |
| `match` | Run a matcher against a response |

**Request format:**

```json
{
  "version": "1",
  "method": "send",
  "params": {
    "provider": "gpt4o",
    "message": "Find flights to Paris",
    "systemPrompt": "You are a travel assistant.",
    "tools": [],
    "temperature": 0.7,
    "maxTokens": 1000
  }
}
```

**Response format (success):**

```json
{
  "success": true,
  "result": {
    "text": "I found flights...",
    "toolCalls": [{ "name": "search", "args": { "query": "Paris" } }],
    "usage": { "inputTokens": 150, "outputTokens": 80, "totalTokens": 230 },
    "latencyMs": 1200,
    "provider": "openai",
    "model": "gpt-4o-mini"
  }
}
```

**Response format (error):**

```json
{
  "success": false,
  "error": { "code": "PROVIDER_ERROR", "message": "Invalid API key" }
}
```

**Match request example:**

```json
{
  "method": "match",
  "params": {
    "matcher": "satisfiesCriteria",
    "response": { "text": "...", "toolCalls": [], "usage": {}, "latencyMs": 0 },
    "args": { "rubric": "Accurate and helpful", "passThreshold": 0.7 },
    "judge": "claude-sonnet"
  }
}
```

Available matchers via exec: `satisfiesCriteria`, `matchesSemanticMeaning`, `classifiedAs`, `doesNotDisclose`, `matchesResponseSchema`.

The `judge` field is optional in match requests. If omitted, the judge configured in `pest.config.json` is used.

The exec command is stateless and safe for concurrent invocation (e.g. parallel PHPUnit via paratest).

See [PHPUnit Integration](/extensions/phpunit) for the primary consumer of this command.

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
