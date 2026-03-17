# CLI Reference

The pest CLI (`@heilgar/pest-cli`) provides project setup tools.

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
