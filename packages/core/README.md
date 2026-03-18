# @heilgar/pest-core

Core library for **pest** (Prompt Evaluation & Scoring Toolkit) — a lightweight TypeScript framework for testing LLM prompts with familiar `expect()` matchers.

## Features

- **Multi-provider support** — OpenAI, Anthropic Claude, Google Gemini, xAI Grok, Ollama, and any OpenAI-compatible API
- **`send()` helper** — call any LLM provider with a consistent interface, including system prompts and tool definitions
- **Deterministic matchers** — `containsToolCall`, `callsToolsInOrder`, `matchesResponseSchema`, `containsText`, `hasToolCallCount`, `respondsWithinTokens`
- **LLM-judged matchers** — `satisfiesCriteria`, `matchesSemanticMeaning`, `classifiedAs`, `doesNotDisclose`
- **Consistency testing** — `assertConsistent` for verifying response stability across multiple runs
- **Schema validation** — validate LLM responses against JSON schemas using valibot, with optional zod support
- **Zero global state** — explicit provider passing, no singletons

## Install

```bash
npm install @heilgar/pest-core
```

## Usage

```typescript
import { send, createProvider } from '@heilgar/pest-core';

const provider = createProvider({ type: 'openai', model: 'gpt-4o', apiKey: '...' });
const response = await send(provider, 'Hello', { systemPrompt: 'You are a helpful assistant.' });
```

Use with `@heilgar/pest-vitest`, `@heilgar/pest-jest`, or `@heilgar/pest-playwright` for test framework integration.

## Documentation

Full docs at [heilgar.github.io/pest](https://heilgar.github.io/pest/)

## License

MIT
