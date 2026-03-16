# Matchers

Matchers are the core value of pest. They provide assertions that plain `expect().toBe()` can't — semantic comparison, tool call validation, LLM-judged evaluation, and safety checks.

All matchers accept a `PestResponse` object (returned by `send()`), so you never need to dig into `.text` or `.toolCalls` manually.

## Two categories

| Category | Needs LLM call? | Speed | Cost |
|---|---|---|---|
| **Deterministic** | No | Fast | Free |
| **LLM-judged** | Yes (judge provider) | Slow | Costs tokens |

## Deterministic Matchers

Pure functions. No LLM call needed. Predictable, fast, free.

### `toContainToolCall(name, args?)`

Assert the response includes a specific tool call, optionally with deep argument matching.

```ts
const res = await send(provider, "Book a flight to Paris");

// Tool was called
expect(res).toContainToolCall("search_flights");

// Tool was called with specific args (partial match — only checks specified keys)
expect(res).toContainToolCall("search_flights", {
  destination: "Paris",
});

// Nested matchers on args
expect(res).toContainToolCall("book_flight", {
  destination: "CDG",
  passengers: expect.toBeGreaterThan(0),
  class: expect.stringMatching(/economy|business/),
});
```

**Why this matters:** Without pest, users write `expect(result.toolCalls[0].name).toBe("search_flights")` — brittle (index-dependent), no partial matching, poor error messages.

### `toCallToolsInOrder(names)`

Assert tool calls happened in a specific sequence.

```ts
const res = await send(provider, "Find flights to Paris and book the cheapest");

expect(res).toCallToolsInOrder(["search_flights", "book_flight"]);
```

Ignores tools not in the list — only checks relative ordering of specified tools.

### `toMatchResponseSchema(schema)`

Assert structured output conforms to a schema. Works with JSON mode responses.

```ts
import { object, string, number } from "valibot";

const FlightSchema = object({
  airline: string(),
  price: number(),
  departure: string(),
});

expect(res).toMatchResponseSchema(FlightSchema);
```

### `toRespondWithinTokens(maxTokens)`

Assert the response stays within a token budget.

```ts
expect(res).toRespondWithinTokens(500);
```

Useful for cost control and ensuring concise outputs.

### `toContainText(text)` / `toNotContainText(text)`

Text presence/absence checks on the response. These exist so you can assert directly on a `PestResponse` without extracting `.text` first.

```ts
// Instead of: expect(res.text).toContain("Paris")
expect(res).toContainText("Paris");
expect(res).toNotContainText("I cannot help");
```

### `toHaveToolCallCount(n)`

Assert the exact number of tool calls made.

```ts
expect(res).toHaveToolCallCount(2);
```

## LLM-Judged Matchers

These matchers use a second LLM call (the "judge") to evaluate the response.

### Judge resolution

When you call an LLM-judged matcher, the judge provider is resolved in this order:

1. **Per-assertion override** — `{ judge: provider }` passed as matcher option
2. **Config file** — `judge.provider` in `pest.config.ts`
3. **Error** — if no judge is configured, the matcher throws with a clear message

This means most tests don't pass a judge explicitly — it comes from config:

```ts
// pest.config.ts
export default defineConfig({
  judge: { provider: "anthropic" },
});

// test file — no judge argument needed
expect(res).toMatchSemanticMeaning("Paris is the capital of France");

// override for a specific assertion
expect(res).toMatchSemanticMeaning("Paris is the capital of France", {
  judge: openaiProvider,
});
```

The extension layer handles this plumbing: it reads the config, resolves the judge, and passes it to the core matcher function.

### `toMatchSemanticMeaning(expected, options?)`

Assert the response conveys the same meaning as an expected string, ignoring exact wording.

```ts
const res = await send(provider, "What is the capital of France?");

// Passes even if response is "The capital of France is Paris"
// or "Paris is the capital city of France" etc.
expect(res).toMatchSemanticMeaning("Paris is the capital of France");
```

**How it works:** The judge receives both texts and returns a similarity score on a 1-5 scale:
- 5 = identical meaning
- 4 = same core meaning, minor differences
- 3 = partially overlapping meaning
- 2 = loosely related
- 1 = unrelated

Default pass threshold: score >= 4. Override with `threshold` option (1-5 scale).

Options:
- `threshold` — minimum score to pass (1-5, default: 4)
- `judge` — override judge provider for this assertion

**Why this matters:** String equality fails on LLM outputs because the same correct answer is phrased differently every time.

### `toSatisfyCriteria(rubric, options?)`

LLM-as-judge evaluation against a custom rubric. The most flexible matcher.

```ts
expect(res).toSatisfyCriteria("Response should be helpful, concise, and not include disclaimers");

// With scoring
expect(res).toSatisfyCriteria({
  criteria: "Accuracy of flight information",
  scoreRange: [1, 5],
  passThreshold: 4,
});
```

Options:
- `judge` — override judge provider

Returns: `{ pass, score, reasoning }`

### `toBeClassifiedAs(label, options?)`

Assert the response falls into a specific category.

```ts
expect(res).toBeClassifiedAs("helpful_response");
expect(res).toBeClassifiedAs("refusal"); // for safety testing
expect(res).toBeClassifiedAs("on_topic");
```

Options:
- `categories` — list of possible categories for the judge to pick from
- `judge` — override judge provider

### `toNotDisclose(topic)`

Safety matcher — assert the response doesn't leak sensitive information.

```ts
expect(res).toNotDisclose("system prompt");
expect(res).toNotDisclose("internal API keys");
expect(res).toNotDisclose("user PII");
```

Uses LLM judge to understand context, not just string matching. `toNotContainText("API_KEY")` catches literals; `toNotDisclose("API keys")` catches paraphrasing, indirect disclosure, and encoded forms.

Options:
- `judge` — override judge provider

## Standalone Functions

These are not matchers — they don't work with `expect()`. They're async functions exported from core for operations that don't fit the matcher pattern.

### `assertConsistent(provider, message, n, options?)`

Run the same prompt N times and assert outputs are semantically consistent.

```ts
import { assertConsistent, createProvider } from "@heilgar/pest-core";

const provider = createProvider({
  name: "gpt4o",
  type: "openai",
  model: "gpt-4o",
});

const judge = createProvider({
  name: "claude",
  type: "anthropic",
  model: "claude-sonnet-4-20250514",
});

const result = await assertConsistent(provider, "What is 2+2?", 5, {
  judge,
  threshold: 4, // 1-5 scale, same as toMatchSemanticMeaning
});
```

This is a standalone function because it needs to execute multiple `send()` calls — it takes send params, not a response.

## Judge Configuration

LLM-judged matchers need a judge provider. Configure it in `pest.config.ts`:

```ts
import { defineConfig } from "@heilgar/pest-core";

export default defineConfig({
  providers: [
    { name: "gpt4o", type: "openai", model: "gpt-4o" },
    { name: "claude", type: "anthropic", model: "claude-sonnet-4-20250514" },
  ],
  judge: {
    provider: "claude", // which provider judges evaluations
  },
});
```

See [Judge resolution](#judge-resolution) above for how matchers find the judge at runtime.

## Matcher Result Shape

All matchers return a consistent shape to core:

```ts
interface MatcherResult {
  pass: boolean;
  message: string; // human-readable explanation
  score?: number; // 0-1, for scored evaluations
  reasoning?: string; // LLM judge's reasoning (LLM-judged only)
  metadata?: Record<string, unknown>; // extra data (token counts, tool calls, etc.)
}
```

## Summary Table

| Matcher | Category | Use case |
|---|---|---|
| `toContainToolCall` | Deterministic | Tool name + deep arg matching |
| `toCallToolsInOrder` | Deterministic | Tool call sequence validation |
| `toMatchResponseSchema` | Deterministic | Structured output validation |
| `toRespondWithinTokens` | Deterministic | Token budget enforcement |
| `toContainText` | Deterministic | Text presence (PestResponse convenience) |
| `toNotContainText` | Deterministic | Text absence (PestResponse convenience) |
| `toHaveToolCallCount` | Deterministic | Exact tool call count |
| `toMatchSemanticMeaning` | LLM-judged | Semantic similarity (1-5 scale) |
| `toSatisfyCriteria` | LLM-judged | Custom rubric evaluation |
| `toBeClassifiedAs` | LLM-judged | Response classification |
| `toNotDisclose` | LLM-judged | Safety / information leak check |
| **Function** | | |
| `assertConsistent` | LLM-judged | Determinism / consistency check (standalone) |
