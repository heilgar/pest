# pest — LLM Integration Guide

This document is a table of contents for LLMs helping users write tests with pest. It points to comprehensive documentation organized by topic.

---

## Quick Navigation

### Setup & Installation
- **[Getting Started](/guide/getting-started)** — Installation, setup, writing first tests for vitest/jest/playwright/phpunit
- **[PHPUnit Integration](/extensions/phpunit)** — PHP-specific setup, assertions, MCP testing, and CLI bridge configuration

### API Reference
- **[API Reference](/reference/api)** — Complete API docs for all packages:
  - `send()` / `sendAgentic()` — Sending messages to LLMs
  - `createProvider()` — Creating provider instances (Anthropic, OpenAI, Gemini, X.AI, Ollama)
  - `zodTool()` — Converting Zod schemas to tool definitions
  - `setJudge()` — Configuring LLM judges for semantic matchers
  - Types: `PestResponse`, `ToolCall`, `ProviderConfig`, etc.

### Matchers
- **[Matchers](/architecture/matchers)** — Complete matcher reference:
  - **Deterministic**: `toContainToolCall()`, `toCallToolsInOrder()`, `toMatchResponseSchema()`, `toRespondWithinTokens()`, `toHaveToolCallCount()`, `toContainText()`, `toNotContainText()`
  - **LLM-judged**: `toMatchSemanticMeaning()`, `toSatisfyCriteria()`, `toBeClassifiedAs()`, `toNotDisclose()`
  - **MCP** (from `@heilgar/pest-mcp`): `toExposeTools()`, `toExposeTool()`, `toExposePrompts()`, `toExposeResources()`, `toHaveValidToolSchemas()`
  - **Standalone**: `assertConsistent()`

### Extensions
- **[Vitest](/extensions/vitest)** — vitest setup, plugin, reporter
- **[Jest](/extensions/jest)** — jest setup, reporter
- **[Playwright](/extensions/playwright)** — Playwright LLM-judged matchers for locators/strings
- **[PHPUnit](/extensions/phpunit)** — PHP integration via pest-llm, CLI bridge, AssertLlm trait
- **[MCP](/extensions/mcp)** — MCP server testing: discovery, tool execution, LLM+MCP e2e

### Examples & Patterns
- **[Examples](/guide/examples)** — Real-world testing patterns:
  - Tool-calling agents
  - Semantic response testing
  - Safety testing (prompt leaks, API keys)
  - Structured output validation
  - Token budget testing
  - Parameterized tests
  - Multi-provider testing
  - Consistency testing
  - Combining matchers

### Configuration
- **[Configuration Guide](/guide/configuration)** — `pest.config.ts` / `pest.config.json` setup, provider config, judge config, pricing, env var interpolation
- **[Configuration Reference](/reference/configuration)** — Complete config schema

### CLI
- **[CLI Reference](/reference/cli)** — `pest install`, `pest qa --mcp`, `pest eval`, `pest exec` commands

### Architecture
- **[Core API](/architecture/core-api)** — Internal architecture of pest-core
- **[Packages](/architecture/packages)** — Package structure and organization

---

## Package Map

| Package | npm name | Purpose |
|---|---|---|
| `packages/core` | `@heilgar/pest-core` | Providers, `send()`, `sendAgentic()`, `zodTool()`, matcher logic, config |
| `packages/vitest` | `@heilgar/pest-vitest` | vitest plugin + matchers + reporter (alias: `pest`) |
| `packages/jest` | `@heilgar/pest-jest` | jest matchers + setup |
| `packages/playwright` | `@heilgar/pest-playwright` | Playwright LLM-judged matchers for locators/strings |
| `packages/mcp` | `@heilgar/pest-mcp` | MCP server testing: `useMcpServer()`, `sendWithMcp()`, discovery matchers |
| `packages/cli` | `@heilgar/pest-cli` | CLI: `pest install`, `pest qa --mcp`, `pest eval`, `pest exec` |
| `packages/pest-llm` | `heilgar/pest-llm` (Composer) | PHPUnit assertions via CLI bridge |

---

## Common Tasks

### How do I send a message to an LLM?
→ See [API Reference](/reference/api#send) for `send()` and options

### How do I test multi-turn tool-calling sequences?
→ See [API Reference](/reference/api#sendAgentic) for `sendAgentic()` and [Examples](/guide/examples#tool-calling-agent)

### How do I create a provider?
→ See [API Reference](/reference/api#createProvider) and [Getting Started](/guide/getting-started#set-up-providers)

### How do I assert tool calls?
→ See [Matchers](/architecture/matchers#toContainToolCall) for `toContainToolCall()`, `toCallToolsInOrder()`, `toHaveToolCallCount()`

### How do I test semantic meaning?
→ See [Matchers](/architecture/matchers#toMatchSemanticMeaning) for LLM-judged matchers

### How do I test safety/prompt leaks?
→ See [Matchers](/architecture/matchers#toNotDisclose) and [Examples](/guide/examples#safety-testing)

### How do I configure vitest/jest/playwright?
→ See [Getting Started](/guide/getting-started) for setup instructions per test runner

### How do I test an MCP server?
→ See [MCP Extension](/extensions/mcp) for `useMcpServer()`, `sendWithMcp()`, and discovery matchers

### How do I configure MCP servers?
→ Add `mcp.servers` to `pest.config.ts`. See [Configuration](/reference/configuration) and [MCP Extension](/extensions/mcp)

### How do I test with PHPUnit?
-> See [PHPUnit Integration](/extensions/phpunit) for installation, `AssertLlm` trait, and all PHP assertions

### How do I use pest from PHP or other languages?
-> `pest exec` reads JSON from stdin and returns JSON to stdout. See [CLI Reference](/reference/cli#pest-exec)

### How do I run a quick MCP server check?
-> `pest qa --mcp <serverName>`. See [CLI Reference](/reference/cli)

### How do I compare multiple LLM providers against the same test cases?
-> Use `defineEval` to define an eval suite (`.eval.ts` file), then run `pest eval`. See [Multi-Model Eval](/guide/eval) and [CLI Reference](/reference/cli#pest-eval)

### How do I write an eval suite?
-> Create a `*.eval.ts` file using `defineEval({ cases: [...], providers: [...], scorers: [...] })`. Each case defines an input and expected criteria; scorers assess each provider response. See [Multi-Model Eval](/guide/eval)

### How do I export eval results to JSON or HTML?
-> Pass `--json <path>` and/or `--html <path>` to `pest eval`. See [CLI Reference](/reference/cli#pest-eval)
