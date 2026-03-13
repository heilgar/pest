# CLI Reference

## Commands

### `pest` / `pest run`

Run test files.

```bash
# Run all *.pest.ts files
npx pest

# Run specific file
npx pest tests/support.pest.ts

# Run specific directory
npx pest tests/support/

# Filter tests by name
npx pest --filter "refund"

# Run with specific providers only
npx pest --providers gpt-4o,claude-sonnet

# Override config
npx pest --config custom.config.ts

# Output format
npx pest --format json

# Verbose (show full responses)
npx pest --verbose
```

### `pest compare`

Compare models side-by-side.

```bash
npx pest compare tests/support.pest.ts
npx pest compare tests/support.pest.ts --providers gpt-4o,claude-sonnet,llama-local
npx pest compare tests/support.pest.ts --tag "v2-prompt"
npx pest compare tests/support.pest.ts --output reports/comparison.json
```

### `pest qa`

Generate test cases automatically.

```bash
npx pest qa tests/support.pest.ts
npx pest qa tests/support.pest.ts --cases 30
npx pest qa tests/support.pest.ts --save tests/support-generated.pest.ts
npx pest qa tests/support.pest.ts --iterations 3
npx pest qa tests/support.pest.ts --categories edge_cases,adversarial
```

### `pest tune`

Optimize and compress prompts.

```bash
npx pest tune tests/support.pest.ts
npx pest tune tests/support.pest.ts --iterations 10
npx pest tune tests/support.pest.ts --strategy evolutionary
npx pest tune tests/support.pest.ts --compress --target 0.5
npx pest tune tests/support.pest.ts --diff
npx pest tune tests/support.pest.ts --save src/prompts/support-optimized.ts
```

### `pest history`

View historical results.

```bash
npx pest history tests/support.pest.ts
npx pest history tests/support.pest.ts --compare
```

### `pest init`

Initialize a new pest project.

```bash
npx pest init
npx pest init --providers openai,anthropic
```

Creates `pest.config.ts` and an example `tests/example.pest.ts`.

## Global options

| Option | Description |
|--------|-------------|
| `--config <path>` | Config file path (default: `pest.config.ts`) |
| `--filter <pattern>` | Run tests matching pattern |
| `--providers <list>` | Comma-separated provider names |
| `--format <type>` | Output: `console`, `json`, `html` |
| `--output <dir>` | Report output directory |
| `--verbose` | Show full response details |
| `--no-cache` | Disable response caching |
| `--concurrency <n>` | Max parallel requests |
| `--timeout <ms>` | Per-request timeout |
| `--help` | Show help |
| `--version` | Show version |

## Environment variables

| Variable | Description |
|----------|-------------|
| `PEST_CONFIG` | Config file path |
| `PEST_CACHE_DIR` | Cache directory |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GOOGLE_AI_API_KEY` | Google Gemini API key |
| `XAI_API_KEY` | xAI Grok API key |

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All tests passed |
| `1` | One or more tests failed |
| `2` | Configuration error |
| `3` | Runtime error (API failure, timeout) |
