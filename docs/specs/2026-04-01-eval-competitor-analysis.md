# Multi-Model Eval — Competitor Analysis

## Landscape Summary

| Tool | Config Format | Multi-Model Comparison | CLI-First | Open Source | Pricing Entry |
|------|--------------|----------------------|-----------|-------------|---------------|
| **Promptfoo** | YAML (declarative) | Native (list providers) | Yes | MIT | Free |
| **Braintrust** | Python/TS (code) | Via separate experiments | Partial | No (AutoEvals OSS) | Free / $249/mo |
| **LangSmith** | Python/TS (code) | Via experiment comparison | No | No | Free / $39/seat |
| **Arize Phoenix** | Python (code) | Not primary focus | No | Yes | Free |
| **OpenAI Evals** | API + YAML (legacy) | Limited | Legacy only | Partial | API costs |
| **W&B Weave** | Python (decorators) | Via experiments | No | No | Free / $50/user |
| **DeepEval** | Python (pytest) | Not primary focus | Yes (pytest) | MIT | Free |
| **Langfuse** | Python/TS (code) | Not primary focus | No | Yes | Free / $199/mo |

## Key Competitors

### Promptfoo (main benchmark)

The closest competitor. YAML declarative config where you list providers and test cases with assertions. Multi-model comparison is a first-class concept — list multiple providers and every case runs against all of them.

```yaml
providers:
  - openai:gpt-4o
  - anthropic:messages:claude-sonnet-4-20250514

tests:
  - vars: { input: "Hello" }
    assert:
      - type: contains
        value: "hello"
      - type: llm-rubric
        value: "response is friendly"
```

Strengths: 90+ providers, CLI-first, MIT licensed, used by OpenAI/Anthropic.
Weaknesses: No production observability, YAML gets verbose, owned by OpenAI now.

### Braintrust

Code-first (Python/TS) with a polished web dashboard. Multi-model comparison requires running separate experiments and comparing in UI. AutoEvals library has 25+ built-in scorers (Factuality, Closed QA, Humor, etc.).

```typescript
Eval("My Bot", {
  data: () => [{ input: "Foo", expected: "Hi Foo" }],
  task: async (input) => "Hi " + input,
  scores: [Factuality],
});
```

Strengths: Best built-in scorer library, polished comparison UI.
Weaknesses: Not OSS (platform), $249/mo jump from free tier, no declarative config.

### DeepEval

Pytest-style Python framework with 50+ built-in metrics. CLI-driven via `deepeval test run`. No declarative multi-model comparison.

```python
def test_correctness():
    metric = GEval(name="Correctness", criteria="...", threshold=0.5)
    test_case = LLMTestCase(input="...", actual_output="...", expected_output="...")
    assert_test(test_case, [metric])
```

Strengths: Largest metric library, pytest integration.
Weaknesses: Python-only, multi-model not first-class.

### LangSmith, W&B Weave, Arize Phoenix

All platform-oriented tools where evaluation is secondary to observability/tracing. Multi-model comparison requires manual orchestration of separate experiment runs. Web UI focused, not CLI-first.

### OpenAI Evals

Fragmented between legacy CLI (open source YAML) and new Evals API. Strongly biased toward OpenAI models. Not a serious multi-provider comparison tool.

### Humanloop

Shutting down September 2025. Not relevant.

## Differentiation Opportunities for Pest

### 1. Test-framework native

Promptfoo is standalone with its own YAML DSL. Braintrust/DeepEval use Python test frameworks. **Pest is the only tool that integrates multi-model eval into JS/TS test runners (vitest, jest) AND supports PHP via CLI bridge.** No other tool bridges JS and PHP ecosystems.

### 2. Programmatic eval config (not YAML)

Promptfoo's YAML is simple but limited — no conditional logic, no imports, no type checking. Pest's `defineEval` is a typed TypeScript function that can import real application code (prompts, tools, tool executors). Users get autocomplete, type safety, and the ability to generate cases programmatically.

### 3. Agentic evaluation built-in

Most tools focus on single-turn prompt→response evaluation. Pest's `sendAgentic()` with tool executor support means multi-turn tool-calling flows can be evaluated across providers. Promptfoo has some agent support but it's not as deeply integrated.

### 4. Combined deterministic + LLM-judged scoring

All competitors support both, but pest's existing matcher library (tool call assertions, schema validation, semantic matching, safety checks) provides a unique combination of testing primitives that are already battle-tested in the vitest/jest context.

### 5. Cost-effective local-first

No platform dependency. No cloud dashboard to pay for. JSON output + static HTML report means zero ongoing infrastructure cost. Users pay only for LLM API calls.

## What to Learn From Competitors

| Lesson | Source | Application |
|--------|--------|-------------|
| Provider list in config is the right UX | Promptfoo | Already in our design |
| Built-in scorer/metric library matters | Braintrust, DeepEval | Leverage existing matchers, consider adding more |
| YAML is simple but limiting for complex cases | Promptfoo | Our TS function approach is better for power users |
| Side-by-side comparison UI is table stakes | Promptfoo, Braintrust | Our HTML report with provider tabs covers this |
| Cost + latency tracking per provider | All tools | Already built into pest core |
| CI/CD integration (exit codes, JSON output) | Promptfoo, DeepEval | Ensure `pest eval` returns non-zero on failure threshold |

## Competitive Positioning

Pest eval is **not** trying to be a platform. It's a developer tool that:
- Lives in your test suite, not a separate dashboard
- Uses TypeScript config with real imports, not a YAML DSL
- Supports both JS/TS and PHP ecosystems
- Produces portable artifacts (JSON + HTML), not vendor-locked dashboards
- Integrates agentic multi-turn evaluation natively

The closest competitor is promptfoo. Pest differentiates through typed programmatic config, test-framework integration, agentic support, and PHP bridge.
