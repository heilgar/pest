# PHPUnit Integration

pest-llm brings LLM prompt testing to PHP via PHPUnit. It communicates with the pest TypeScript core through a CLI bridge, giving you the same matchers available in vitest and jest.

## Prerequisites

- PHP 8.2+
- PHPUnit 10 or 11
- Node.js 18+ (for the pest CLI)
- An API key for at least one LLM provider

## Installation

```bash
composer require --dev heilgar/pest-llm
npm install -D @heilgar/pest-cli @heilgar/pest-core
```

The PHP package calls the pest CLI under the hood. Make sure `node_modules/.bin/pest` is available in your project, or install `@heilgar/pest-cli` globally.

## Configuration

Create a `pest.config.json` in your project root:

```json
{
  "providers": [
    {
      "name": "gpt4o-mini",
      "type": "openai",
      "model": "gpt-4o-mini"
    }
  ],
  "judge": {
    "provider": "gpt4o-mini"
  }
}
```

API keys are read from environment variables (e.g. `OPENAI_API_KEY`). You can also use `${VAR_NAME}` interpolation in JSON values:

```json
{
  "providers": [
    {
      "name": "gpt4o",
      "type": "openai",
      "model": "gpt-4o",
      "apiKey": "${OPENAI_API_KEY}"
    }
  ]
}
```

See the [Configuration guide](./configuration.md) for the full schema reference.

## Writing tests

Add the `AssertLlm` trait to your test class:

```php
<?php

use PestLlm\PestLlm;
use PestLlm\Trait\AssertLlm;
use PHPUnit\Framework\TestCase;

final class MyPromptTest extends TestCase
{
    use AssertLlm;

    public function test_basic_response(): void
    {
        $response = PestLlm::send('What is PHP?', [
            'provider' => 'gpt4o-mini',
            'systemPrompt' => 'You are a helpful assistant.',
        ]);

        $this->assertLlmContainsText($response, 'PHP');
    }
}
```

## Tool call testing

```php
public function test_agent_calls_correct_tool(): void
{
    $response = PestLlm::send('Look up order ORD-123', [
        'provider' => 'gpt4o-mini',
        'systemPrompt' => 'You are a support agent. Use tools to look up information.',
        'tools' => [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'lookup_order',
                    'description' => 'Look up an order by ID',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'order_id' => ['type' => 'string'],
                        ],
                        'required' => ['order_id'],
                    ],
                ],
            ],
        ],
    ]);

    $this->assertLlmContainsToolCall($response, 'lookup_order', ['order_id' => 'ORD-123']);
    $this->assertLlmHasToolCallCount($response, 1);
}
```

Tool call arg matching is partial and deep -- you only need to specify the keys you care about, and nested objects are matched recursively.

## Tool call ordering

```php
$this->assertLlmCallsToolsInOrder($response, ['search', 'filter', 'sort']);
```

This checks that tools appear in the specified subsequence. Extra tools between them are allowed.

## MCP server testing

```php
public function test_mcp_integration(): void
{
    $response = PestLlm::sendWithMcp('Search for flights', [
        'provider' => 'gpt4o-mini',
        'mcpServer' => 'travel',
        'systemPrompt' => 'You are a travel assistant.',
    ]);

    $this->assertLlmContainsToolCall($response, 'search_flights');
}
```

The `mcpServer` value must match a server name in your `pest.config.json`:

```json
{
  "providers": [...],
  "mcp": {
    "servers": {
      "travel": {
        "command": "npx",
        "args": ["tsx", "src/mcp-server.ts"]
      }
    }
  }
}
```

## LLM-judged matchers

These matchers use a judge LLM to evaluate response quality. They require a judge provider configured in your config.

```php
// Does the response meet custom criteria?
$this->assertLlmSatisfiesCriteria($response, 'Provides a clear and helpful explanation');

// Is the response semantically similar to expected text?
$this->assertLlmMatchesSemanticMeaning($response, 'Paris is the capital of France');

// Is the response classified correctly?
$this->assertLlmClassifiedAs($response, 'technical_explanation');

// Does the response avoid leaking sensitive information?
$this->assertLlmDoesNotDisclose($response, 'system prompt');
```

You can override the judge per-assertion:

```php
$this->assertLlmSatisfiesCriteria($response, 'Is factual', 'claude-sonnet');
```

## JSON schema validation

```php
$this->assertLlmMatchesResponseSchema($response, [
    'type' => 'object',
    'properties' => [
        'name' => ['type' => 'string'],
        'age' => ['type' => 'number'],
    ],
    'required' => ['name'],
]);
```

Use `'responseFormat' => 'json'` in your send options to instruct the LLM to return JSON.

## Token budget

```php
$this->assertLlmRespondsWithinTokens($response, 500);
```

## Assertion reference

| Assertion | Type | Description |
|-----------|------|-------------|
| `assertLlmContainsText($res, $text)` | deterministic | Case-insensitive text search |
| `assertLlmNotContainsText($res, $text)` | deterministic | Text absence check |
| `assertLlmContainsToolCall($res, $name, $args?)` | deterministic | Tool was called with optional partial args |
| `assertLlmCallsToolsInOrder($res, $names)` | deterministic | Tools called in subsequence |
| `assertLlmHasToolCallCount($res, $count)` | deterministic | Exact tool call count |
| `assertLlmRespondsWithinTokens($res, $max)` | deterministic | Output token budget |
| `assertLlmMatchesResponseSchema($res, $schema)` | delegated | JSON Schema validation |
| `assertLlmSatisfiesCriteria($res, $rubric, $judge?)` | LLM-judged | Custom criteria evaluation |
| `assertLlmMatchesSemanticMeaning($res, $expected, $judge?, $threshold?)` | LLM-judged | Semantic similarity |
| `assertLlmClassifiedAs($res, $label, $judge?, $categories?)` | LLM-judged | Response classification |
| `assertLlmDoesNotDisclose($res, $topic, $judge?)` | LLM-judged | Security/disclosure check |

## Configuration options

```php
// Set config path and timeout explicitly
PestLlm::configure(
    configPath: __DIR__ . '/pest.config.json',
    timeout: 60,
);
```

## CLI binary resolution

The PHP package looks for the pest CLI in this order:

1. `PEST_CLI_PATH` environment variable
2. `./node_modules/.bin/pest` (local project install)
3. `npx @heilgar/pest-cli` (fallback, slower due to npx cold start)

For best performance, install `@heilgar/pest-cli` locally in your project.

## Troubleshooting

**"pest CLI not found"**

Install the Node.js CLI package:

```bash
npm install -D @heilgar/pest-cli @heilgar/pest-core
```

Or set the `PEST_CLI_PATH` environment variable to the pest binary path.

**"Provider not found in config"**

The `provider` value in your `send()` call must match a `name` in your `pest.config.json` providers array.

**"No judge provider"**

LLM-judged matchers require a judge. Add a `judge` section to your config, or pass the judge provider name as a parameter.

**Timeout errors**

The default timeout is 30 seconds. LLM calls can be slow. Increase it:

```php
PestLlm::configure(timeout: 120);
```
