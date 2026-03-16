# Jest Extension

`@heilgar/pest-jest` registers pest matchers with jest's `expect`.

## Setup

```bash
npm install @heilgar/pest-jest @heilgar/pest-core
```

### Option 1: Setup file

```ts
// jest.setup.ts
import { loadEnv } from "@heilgar/pest-core";
import { pestMatchers } from "@heilgar/pest-jest";

loadEnv();
expect.extend(pestMatchers);
```

```json
// jest.config.json
{
  "setupFiles": ["./jest.setup.ts"]
}
```

### Option 2: Per-file

```ts
import { loadEnv } from "@heilgar/pest-core";
import { pestMatchers } from "@heilgar/pest-jest";

loadEnv();
expect.extend(pestMatchers);
```

## TypeScript

Add type declarations to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@heilgar/pest-jest"]
  }
}
```

This extends jest's `Matchers` interface so `expect(res).toContainToolCall(...)` has full type support.

## Usage

Once registered, all pest matchers are available on `expect()`:

```ts
import { send, createProvider } from "@heilgar/pest-core";

const provider = createProvider({
  name: "gpt4o",
  type: "openai",
  model: "gpt-4o",
});

describe("flight booking agent", () => {
  test("calls search tool for flight queries", async () => {
    const res = await send(provider, "Find flights to Paris tomorrow", {
      tools: flightTools,
    });

    expect(res).toContainToolCall("search_flights", {
      destination: "Paris",
    });
  });

  test("responds with relevant information", async () => {
    const res = await send(provider, "What is the capital of France?");

    expect(res).toMatchSemanticMeaning("Paris is the capital of France");
  });
});
```

## Differences from Vitest Extension

The API is identical. The only differences are:
- Import source: `@heilgar/pest-jest` instead of `@heilgar/pest-vitest`
- Setup mechanism: jest's `setupFilesAfterFramework` vs vitest's `setupFiles`
- Type declarations: extends `jest.Matchers` instead of vitest's `Assertion`

## Available Matchers

See [Matchers](/architecture/matchers) for the full list. All matchers listed there are available after `expect.extend(pestMatchers)`.
