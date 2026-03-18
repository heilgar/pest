# Package Architecture

pest is split into focused packages with clear boundaries.

```
@heilgar/pest-core         — shared foundation (providers, send, matcher logic, evaluators)
@heilgar/pest-vitest       — vitest expect.extend() matchers
@heilgar/pest-jest         — jest expect.extend() matchers
@heilgar/pest-playwright   — Playwright expect.extend() matchers (LLM-judged only)
@heilgar/pest-mcp          — MCP server testing (discovery, tool execution, LLM+MCP e2e)
@heilgar/pest-cli          — CLI tools (install, qa)
```

## Core (`@heilgar/pest-core`)

The minimum shared foundation that any test framework extension needs.

| Responsibility | Description |
|---|---|
| **Providers** | Abstraction over OpenAI, Anthropic, Google, xAI, Ollama SDKs |
| **`send()`** | Explicit provider call — `send(provider, message, options)` |
| **Types** | Response shapes, tool call types, provider config, matcher result types |
| **Matcher logic** | Pure functions that evaluate assertions — return `{ pass, message }` |
| **Evaluators** | LLM-as-judge functions — async functions that return scores/booleans |
| **Config loader** | Reading `pest.config.ts` for provider definitions and global settings |

### What does NOT belong in core

- **Tuner** — belongs in CLI
- **Cache** — not needed for now
- **Test runners** — that's the framework's job
- **Reporter formatting** — belongs in CLI

### Design principles

- Zero heavy deps beyond provider SDKs
- All matcher functions are pure: `(response, ...args) => { pass: boolean, message: string }`
- Evaluator functions are async: `(response, criteria, judgeProvider) => Promise<{ pass, score, reasoning }>`
- No global state — provider is always passed explicitly to `send()`
- Judge provider is resolved by the extension layer (config → per-assertion override)

## Extensions (`@heilgar/pest-vitest`, `@heilgar/pest-jest`, `@heilgar/pest-playwright`)

Thin wrappers that register core matcher logic with their respective test frameworks.

**What extensions do:**
1. Import matcher logic from `@heilgar/pest-core`
2. Wrap it in the framework's `expect.extend()` format
3. Provide TypeScript declarations for `expect(...).toMatchSemanticMeaning()`
4. Handle framework-specific async matcher patterns

**What extensions do NOT do:**
- Contain business logic
- Implement their own matching algorithms
- Manage providers or config

```ts
// Conceptual: what a vitest extension looks like internally
import { containsToolCall, matchesSemanticMeaning } from '@heilgar/pest-core';

export const pestMatchers = {
  toContainToolCall(received, name, args) {
    return containsToolCall(received, name, args);
  },
  async toMatchSemanticMeaning(received, expected, options) {
    return matchesSemanticMeaning(received, expected, options);
  },
};
```

Each extension is ~50 lines of glue code, not a "plugin".

### Playwright extension

The Playwright extension differs from vitest/jest in one key way: it works on **strings and locators**, not `PestResponse` objects. In E2E tests, you assert on rendered text — there are no structured API responses.

Only LLM-judged matchers are available (the deterministic matchers like `toContainToolCall` don't apply to DOM text):

```ts
await expect(page.locator('.ai-response')).toMatchSemanticMeaning("expected");
await expect(page.locator('.ai-response')).toNotDisclose("system prompt");
```

## CLI (`@heilgar/pest-cli`)

Project setup tool:

| Command | Description |
|---|---|
| `pest install` | Install Claude Code agents and skills for pest |

The CLI installs agent templates (test writer, test healer) and a skill (test generator) into `.claude/`. Tests are run directly via vitest or jest — the CLI does not have its own runner.

## MCP (`@heilgar/pest-mcp`)

MCP server testing — a peer package alongside the test framework extensions.

| Responsibility | Description |
|---|---|
| **MCP client** | Connect to MCP servers via stdio or SSE/HTTP |
| **Server testing** | Matchers for tool discovery, schema validation, prompts, resources |
| **LLM+MCP bridge** | `sendWithMcp()` auto-bridges LLM providers to MCP server tools |
| **CLI QA** | Smoke test logic for `pest qa --mcp` |

See [MCP Extension](/extensions/mcp) for usage.

## Dependency Graph

```
@heilgar/pest-vitest      ──┐
                            │
@heilgar/pest-jest        ──┼──▶  @heilgar/pest-core
                            │
@heilgar/pest-playwright  ──┤          ▲
                            │          │
@heilgar/pest-mcp         ──┤          │
       │                    │          │
       └── @mcp/sdk         │          │
                            │          │
@heilgar/pest-cli         ──┘──────────┘
```

No circular dependencies. Core knows nothing about its consumers. The MCP package is a peer to the test framework extensions — they don't depend on each other.
