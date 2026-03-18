# @heilgar/pest-cli

CLI for **pest** (Prompt Evaluation & Scoring Toolkit) — run LLM prompt tests from the command line. Shells out to Vitest or Jest, so your existing test config works out of the box.

## Features

- **`pest` command** — run prompt tests with a single command
- **Framework auto-detection** — detects Vitest or Jest in your project and delegates to it
- **QA generation** — `pest qa` generates test cases for your prompts using an LLM
- **Zero config** — works with your existing `vitest.config.ts` or `jest.config.ts`

## Install

```bash
npm install -g @heilgar/pest-cli
# or
npx @heilgar/pest-cli
```

## Usage

```bash
# Run all prompt tests
pest

# Generate QA test cases
pest qa
```

## Documentation

Full docs at [heilgar.github.io/pest](https://heilgar.github.io/pest/)

## License

MIT
