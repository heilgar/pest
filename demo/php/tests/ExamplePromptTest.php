<?php

declare(strict_types=1);

namespace Demo\Tests;

use PestLlm\PestLlm;
use PestLlm\Trait\AssertLlm;
use PHPUnit\Framework\TestCase;

final class ExamplePromptTest extends TestCase
{
    use AssertLlm;

    public function test_basic_response_contains_text(): void
    {
        $response = PestLlm::send('What is PHP?', [
            'provider' => 'gpt4o-mini',
            'systemPrompt' => 'You are a helpful programming assistant.',
        ]);

        $this->assertLlmContainsText($response, 'PHP');
    }

    public function test_tool_calling(): void
    {
        $response = PestLlm::send('Look up order ORD-123', [
            'provider' => 'gpt4o-mini',
            'systemPrompt' => 'You are a customer support assistant. Use tools to look up information.',
            'tools' => [
                [
                    'type' => 'function',
                    'function' => [
                        'name' => 'lookup_order',
                        'description' => 'Look up an order by ID',
                        'parameters' => [
                            'type' => 'object',
                            'properties' => [
                                'order_id' => ['type' => 'string', 'description' => 'The order ID'],
                            ],
                            'required' => ['order_id'],
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertLlmContainsToolCall($response, 'lookup_order');
        $this->assertLlmHasToolCallCount($response, 1);
    }

    public function test_response_quality(): void
    {
        $response = PestLlm::send('Explain what PHP generics are', [
            'provider' => 'gpt4o-mini',
            'systemPrompt' => 'You are a helpful programming assistant.',
        ]);

        $this->assertLlmSatisfiesCriteria($response, 'Provides a clear and accurate explanation');
    }
}
