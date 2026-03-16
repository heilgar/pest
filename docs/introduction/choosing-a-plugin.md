::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# Choosing a Plugin

pest is distributed as a set of focused packages. Choose based on your existing test setup.

## Packages overview

| Package | Use when |
|---------|----------|
| [`@pest/vitest`](/plugins/vitest) | You use vitest (most TS/Vite projects) |
| [`@pest/jest`](/plugins/jest) | You use jest (many React/Node projects) |
| [`pest-pytest`](/plugins/pytest) | You have a Python project using pytest |

## Which one should I use?

**Use `@pest/vitest` if:**
- Your project already uses vitest
- You want watch mode, coverage, and the vitest UI to work with pest tests
- You're starting fresh — vitest is the recommended default

**Use `@pest/jest` if:**
- Your project uses jest and you can't or don't want to migrate
- You want pest tests to run alongside existing jest tests in the same run

**Use `pest-pytest` if:**
- Your project is Python-based
- You use pytest as your test runner
- You're testing Python applications that call LLM APIs

## Feature comparison

| Feature | `@pest/vitest` | `@pest/jest` | `pest-pytest` |
|---------|:-----------:|:--------:|:---------:|
| `describe` / `test` / `send` API | ✓ | ✓ | ✓ |
| Text matchers | ✓ | ✓ | ✓ |
| Tool call matchers | ✓ | ✓ | ✓ |
| LLM-as-Judge | ✓ | ✓ | ✓ |
| LLM-as-QA | ✓ | ✓ | ✓ |
| Model comparison | ✓ | ✓ | ✓ |
| Prompt tuning | ✓ | ✓ | ✓ |
| Watch mode | Native | Native | Native |
| Coverage | Via vitest | Via jest | Via pytest-cov |
| Test UI | vitest UI | — | — |

All plugins share the same core concepts — the API and behavior are identical across packages.

## CLI (any plugin)

The `pest` CLI works independently of your test runner plugin. It provides additional commands for QA generation, model comparison, and prompt tuning without requiring vitest or jest:

```bash
npx pest compare     # Run model comparison
npx pest qa          # Generate test cases with LLM-as-QA
npx pest tune        # Optimize a prompt
```

See [CLI Reference](/reference/cli) for details.

## Can I use multiple plugins?

Not recommended. Pick one plugin per project. If you have a monorepo with mixed JS/Python projects, each sub-project picks its own plugin.
