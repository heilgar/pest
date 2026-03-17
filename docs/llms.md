# pest — LLM Integration Guide

This document is a table of contents for LLMs helping users write tests with pest. It points to comprehensive documentation organized by topic.

---

## Quick Navigation

### Setup & Installation
- **[Getting Started](/guide/getting-started)** — Installation, setup, writing first tests for vitest/jest/playwright

### API Reference
- **[API Reference](/reference/api)** — Complete API docs for all packages:
  - `send()` / `sendAgentic()` — Sending messages to LLMs
  - `createProvider()` — Creating provider instances (Anthropic, OpenAI, Gemini, X.AI, Ollama)
  - `zodTool()` — Converting Zod schemas to tool definitions
  - `setJudge()` — Configuring LLM judges for semantic matchers
  - Types: `PestResponse`, `ToolCall`, `ProviderConfig`, etc.

### Matchers
- **[Matchers](/architecture/matchers)** — Complete matcher reference:
  - **Deterministic**: `toContainToolCall()`, `toCallToolsInOrder()`, `toMatchResponseSchema()`, `toRespondWithinTokens()`, `toHaveToolCallCount()`, `toContainText()`
  - **LLM-judged**: `toMatchSemanticMeaning()`, `toSatisfyCriteria()`, `toBeClassifiedAs()`, `toNotDisclose()`
  - **Standalone**: `assertConsistent()`

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
- **[Configuration Guide](/guide/configuration)** — `pest.config.ts` setup, provider config, judge config, pricing, prompts
- **[Configuration Reference](/reference/configuration)** — Complete config schema

### CLI
- **[CLI Reference](/reference/cli)** — `compare`, `qa`, `optimize`, `compress`, `install` commands

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
| `packages/cli` | `@heilgar/pest-cli` | CLI binary for `compare`, `qa`, `optimize`, `compress` |

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
