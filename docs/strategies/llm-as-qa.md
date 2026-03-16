::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# LLM-as-QA

Let an LLM automatically generate test cases for your prompts. Instead of manually writing every edge case, describe expected behavior and let the QA model find the weak spots.

## How it works

1. You provide a system prompt and (optionally) tool definitions
2. The QA model generates diverse test inputs with expected criteria
3. You run the generated cases against your target model
4. The [Judge](/strategies/llm-as-judge) evaluates each response using the QA-generated criteria

QA generates the **what to test**. Judge evaluates the **results**. Together they give you automated coverage discovery.

## Generate test cases

<PluginBlock plugin="vitest">

```typescript
import { generateTestCases } from '@pest/vitest'

const cases = await generateTestCases(qaProvider, SUPPORT_PROMPT, {
  categories: ['happy_path', 'edge_cases', 'adversarial', 'tool_misuse'],
  count: 20,
  tools: supportTools,
})

for (const tc of cases) {
  console.log(`[${tc.category}] ${tc.name}: "${tc.message}"`)
  console.log(`  Criteria: ${tc.criteria}`)
}
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { generateTestCases } from '@pest/jest'

const cases = await generateTestCases(qaProvider, SUPPORT_PROMPT, {
  categories: ['happy_path', 'edge_cases', 'adversarial', 'tool_misuse'],
  count: 20,
  tools: supportTools,
})

for (const tc of cases) {
  console.log(`[${tc.category}] ${tc.name}: "${tc.message}"`)
  console.log(`  Criteria: ${tc.criteria}`)
}
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from pest_pytest import generate_test_cases

cases = await generate_test_cases(qa_provider, SUPPORT_PROMPT,
    categories=["happy_path", "edge_cases", "adversarial", "tool_misuse"],
    count=20,
    tools=support_tools,
)

for tc in cases:
    print(f"[{tc.category}] {tc.name}: \"{tc.message}\"")
    print(f"  Criteria: {tc.criteria}")
```

</PluginBlock>

## Run generated cases with Judge

<PluginBlock plugin="vitest">

```typescript
import { describe, test, generateTestCases } from '@pest/vitest'
import { SUPPORT_PROMPT } from '../src/prompts/support'
import { supportTools } from '../src/tools/support'

const cases = await generateTestCases(qaProvider, SUPPORT_PROMPT, {
  tools: supportTools,
  count: 15,
})

describe('Support Agent - QA Generated', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
}, () => {
  for (const tc of cases) {
    test(`[${tc.category}] ${tc.name}`, async ({ send }) => {
      const res = await send(tc.message)
      await expect(res).toPassJudge(tc.criteria)

      if (tc.expectedTools) {
        for (const tool of tc.expectedTools) {
          expect(res).toCallTool(tool)
        }
      }
    })
  }
})
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { describe, test, generateTestCases } from '@pest/jest'
import { SUPPORT_PROMPT } from '../src/prompts/support'
import { supportTools } from '../src/tools/support'

const cases = await generateTestCases(qaProvider, SUPPORT_PROMPT, {
  tools: supportTools,
  count: 15,
})

describe('Support Agent - QA Generated', {
  systemPrompt: SUPPORT_PROMPT,
  tools: supportTools,
}, () => {
  for (const tc of cases) {
    test(`[${tc.category}] ${tc.name}`, async ({ send }) => {
      const res = await send(tc.message)
      await expect(res).toPassJudge(tc.criteria)

      if (tc.expectedTools) {
        for (const tool of tc.expectedTools) {
          expect(res).toCallTool(tool)
        }
      }
    })
  }
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from pest_pytest import describe, test, generate_test_cases
from src.prompts import SUPPORT_PROMPT
from src.tools import support_tools

cases = await generate_test_cases(qa_provider, SUPPORT_PROMPT,
    tools=support_tools,
    count=15,
)

with describe("Support Agent - QA Generated",
    system_prompt=SUPPORT_PROMPT,
    tools=support_tools,
) as suite:

    for tc in cases:
        @test(f"[{tc.category}] {tc.name}")
        async def test_case(send, case=tc):
            res = await send(case.message)
            await res.assert_passes_judge(case.criteria)

            if case.expected_tools:
                for tool in case.expected_tools:
                    res.assert_calls_tool(tool)
```

</PluginBlock>

## Workflow

1. **Generate** — run QA to produce test cases
2. **Review** — inspect the cases, remove low-quality ones
3. **Run** — execute against your model with judge evaluation
4. **Save** — keep the good cases as permanent regression tests

## Test categories

| Category | What it generates |
|----------|------------------|
| `happy_path` | Normal, expected inputs |
| `edge_cases` | Boundary conditions and unusual but valid inputs |
| `adversarial` | Inputs designed to break or confuse the prompt |
| `tool_misuse` | Inputs that might trigger the wrong tool |
| `refusal` | Things the prompt should decline |

## Options

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
const cases = await generateTestCases(provider, systemPrompt, {
  categories: ['happy_path', 'adversarial'],
  count: 15,
  temperature: 0.7,
  tools: myTools,
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
cases = await generate_test_cases(provider, system_prompt,
    categories=["happy_path", "adversarial"],
    count=15,
    temperature=0.7,
    tools=my_tools,
)
```

</PluginBlock>

## Custom QA prompt

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
export default defineConfig({
  providers: [...],
  prompts: {
    qa: `You are a security-focused QA tester.
Focus on prompt injection, data leakage, and authorization bypass.
Generate ONLY valid JSON array...`,
  },
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```yaml
prompts:
  qa: |
    You are a security-focused QA tester.
    Focus on prompt injection, data leakage, and authorization bypass.
    Generate ONLY valid JSON array...
```

</PluginBlock>
