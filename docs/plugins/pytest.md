::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# pytest Plugin

`pest-pytest` integrates pest with Python's pytest. Test LLM prompts from Python applications using the same `describe` / `test` / `send` concepts, running inside your existing pytest suite.

## Installation

```bash
pip install pest-pytest
```

## Requirements

- Python 3.10+
- pytest 7+

## Setup

### 1. Create pest.config.yaml

```yaml
# pest.config.yaml
providers:
  - name: gpt-4o
    type: openai
    model: gpt-4o
    api_key: ${OPENAI_API_KEY}

judge:
  provider: gpt-4o
  threshold: 0.7
```

### 2. Write a test

```python
# tests/test_assistant.pest.py
from pest_pytest import describe, test

with describe("My Assistant",
    system_prompt="You are a helpful assistant."
) as suite:

    @test("answers factual questions")
    async def test_factual(send):
        res = await send("What is the capital of France?")

        assert res.contains("Paris")
        await res.assert_passes_judge("Answer is factually correct and concise")

    @test("admits uncertainty")
    async def test_uncertainty(send):
        res = await send("What will the stock price of AAPL be tomorrow?")

        await res.assert_passes_judge("Honestly states it cannot predict future prices")
```

### 3. Run tests

```bash
pytest tests/
```

Or run only pest test files:

```bash
pytest tests/ -k "pest"
```

## Directory structure

```
my-project/
├── src/
│   ├── prompts.py
│   └── tools.py
├── tests/
│   ├── test_unit.py            ← regular pytest tests
│   └── test_assistant.pest.py  ← pest tests
├── pest.config.yaml            ← provider config
├── pyproject.toml
└── requirements.txt
```

## Importing your project's prompts

```python
# tests/test_support.pest.py
from pest_pytest import describe, test
from src.prompts import SUPPORT_PROMPT
from src.tools import support_tools

with describe("Customer Support",
    system_prompt=SUPPORT_PROMPT,
    tools=support_tools,
) as suite:

    @test("processes refund requests")
    async def test_refund(send):
        res = await send("Refund order #12345, item was damaged")

        res.assert_calls_tool("process_refund")
        res.assert_calls_tool_with("process_refund", {"order_id": "12345"})
        await res.assert_passes_judge("Confirms refund and is empathetic")
```

## Supported providers

The same providers as the JS packages are supported:

```yaml
# pest.config.yaml
providers:
  - name: gpt-4o
    type: openai
    model: gpt-4o
    api_key: ${OPENAI_API_KEY}

  - name: claude-sonnet
    type: anthropic
    model: claude-sonnet-4-20250514
    api_key: ${ANTHROPIC_API_KEY}

  - name: gemini-2
    type: gemini
    model: gemini-2.5-flash
    api_key: ${GOOGLE_AI_API_KEY}
```

## Matchers

Python assertions map directly to the JS matcher API:

| JS | Python |
|----|--------|
| `expect(res).toContain('x')` | `res.assert_contains('x')` or `assert res.contains('x')` |
| `expect(res).toCallTool('fn')` | `res.assert_calls_tool('fn')` |
| `expect(res).toCallToolWith('fn', args)` | `res.assert_calls_tool_with('fn', args)` |
| `await expect(res).toPassJudge('...')` | `await res.assert_passes_judge('...')` |
| `expect(res).not.toCallTool('fn')` | `res.assert_not_calls_tool('fn')` |

## Configuration reference

See [Configuration](/reference/configuration) for the full config reference. The Python plugin uses YAML (`pest.config.yaml`) instead of TypeScript (`pest.config.ts`), but the structure is the same.
