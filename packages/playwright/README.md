# @heilgar/pest-playwright

Playwright integration for **pest** (Prompt Evaluation & Scoring Toolkit) — add LLM-judged assertions to your Playwright E2E tests. Evaluate page content, element text, and AI-generated UI against semantic criteria.

## Features

- **LLM-judged Playwright assertions** — `expect(locator).toSatisfyCriteria('...')` works on strings and Playwright locators
- **Semantic page testing** — verify that AI-generated or dynamic content meets quality criteria using an LLM judge
- **Works with locators** — pass a Playwright `Locator` directly; pest extracts the text content automatically
- **Extends Playwright's `expect()`** — integrates naturally with Playwright's assertion API

## Install

```bash
npm install @heilgar/pest-playwright @heilgar/pest-core
```

## Quick Start

```typescript
// playwright.config.ts
import { pestSetup } from '@heilgar/pest-playwright/setup';

pestSetup({ judge: { type: 'openai', model: 'gpt-4o', apiKey: '...' } });
```

```typescript
// tests/page.spec.ts
import { test, expect } from '@playwright/test';

test('AI chatbot responds helpfully', async ({ page }) => {
  await page.goto('/chat');
  await page.fill('input', 'How do I reset my password?');
  await page.click('button[type=submit]');
  const response = page.locator('.chat-response');
  await expect(response).toSatisfyCriteria('Provides clear password reset instructions');
});
```

## Documentation

Full docs at [heilgar.github.io/pest](https://heilgar.github.io/pest/)

## License

MIT
