<?php

declare(strict_types=1);

namespace PestLlm\Tests\Unit\Trait;

use PestLlm\Response;
use PestLlm\Trait\AssertLlm;
use PHPUnit\Framework\ExpectationFailedException;
use PHPUnit\Framework\TestCase;

final class AssertLlmTest extends TestCase
{
    use AssertLlm;

    private function makeResponse(array $overrides = []): Response
    {
        return Response::fromArray(array_merge([
            'text' => 'Hello, how can I help you today?',
            'toolCalls' => [],
            'usage' => ['inputTokens' => 10, 'outputTokens' => 8, 'totalTokens' => 18],
            'latencyMs' => 200,
            'provider' => 'openai',
            'model' => 'gpt-4o-mini',
        ], $overrides));
    }

    public function test_contains_text_passes(): void
    {
        $response = $this->makeResponse(['text' => 'PHP is a great language']);
        $this->assertLlmContainsText($response, 'great language');
    }

    public function test_contains_text_is_case_insensitive(): void
    {
        $response = $this->makeResponse(['text' => 'PHP is GREAT']);
        $this->assertLlmContainsText($response, 'great');
    }

    public function test_contains_text_fails(): void
    {
        $this->expectException(ExpectationFailedException::class);
        $response = $this->makeResponse(['text' => 'Hello world']);
        $this->assertLlmContainsText($response, 'missing text');
    }

    public function test_not_contains_text_passes(): void
    {
        $response = $this->makeResponse(['text' => 'Hello world']);
        $this->assertLlmNotContainsText($response, 'missing');
    }

    public function test_not_contains_text_fails(): void
    {
        $this->expectException(ExpectationFailedException::class);
        $response = $this->makeResponse(['text' => 'Hello world']);
        $this->assertLlmNotContainsText($response, 'Hello');
    }

    public function test_contains_tool_call_passes(): void
    {
        $response = $this->makeResponse([
            'toolCalls' => [
                ['name' => 'search', 'args' => ['query' => 'PHP']],
            ],
        ]);
        $this->assertLlmContainsToolCall($response, 'search');
    }

    public function test_contains_tool_call_with_args(): void
    {
        $response = $this->makeResponse([
            'toolCalls' => [
                ['name' => 'search', 'args' => ['query' => 'PHP', 'limit' => 10]],
            ],
        ]);
        $this->assertLlmContainsToolCall($response, 'search', ['query' => 'PHP']);
    }

    public function test_contains_tool_call_with_nested_args(): void
    {
        $response = $this->makeResponse([
            'toolCalls' => [
                ['name' => 'search', 'args' => ['filter' => ['type' => 'price', 'range' => [0, 100]]]],
            ],
        ]);
        $this->assertLlmContainsToolCall($response, 'search', ['filter' => ['type' => 'price']]);
    }

    public function test_contains_tool_call_fails_when_not_called(): void
    {
        $this->expectException(ExpectationFailedException::class);
        $response = $this->makeResponse(['toolCalls' => []]);
        $this->assertLlmContainsToolCall($response, 'search');
    }

    public function test_calls_tools_in_order_passes(): void
    {
        $response = $this->makeResponse([
            'toolCalls' => [
                ['name' => 'search', 'args' => []],
                ['name' => 'filter', 'args' => []],
                ['name' => 'sort', 'args' => []],
            ],
        ]);
        $this->assertLlmCallsToolsInOrder($response, ['search', 'sort']);
    }

    public function test_calls_tools_in_order_fails(): void
    {
        $this->expectException(ExpectationFailedException::class);
        $response = $this->makeResponse([
            'toolCalls' => [
                ['name' => 'sort', 'args' => []],
                ['name' => 'search', 'args' => []],
            ],
        ]);
        $this->assertLlmCallsToolsInOrder($response, ['search', 'sort']);
    }

    public function test_calls_tools_in_order_passes_with_empty_expected(): void
    {
        $response = $this->makeResponse([
            'toolCalls' => [
                ['name' => 'search', 'args' => []],
            ],
        ]);
        $this->assertLlmCallsToolsInOrder($response, []);
    }

    public function test_has_tool_call_count(): void
    {
        $response = $this->makeResponse([
            'toolCalls' => [
                ['name' => 'a', 'args' => []],
                ['name' => 'b', 'args' => []],
            ],
        ]);
        $this->assertLlmHasToolCallCount($response, 2);
    }

    public function test_has_tool_call_count_fails(): void
    {
        $this->expectException(ExpectationFailedException::class);
        $response = $this->makeResponse(['toolCalls' => []]);
        $this->assertLlmHasToolCallCount($response, 1);
    }

    public function test_responds_within_tokens(): void
    {
        $response = $this->makeResponse([
            'usage' => ['inputTokens' => 10, 'outputTokens' => 50, 'totalTokens' => 60],
        ]);
        $this->assertLlmRespondsWithinTokens($response, 100);
    }

    public function test_responds_within_tokens_fails(): void
    {
        $this->expectException(ExpectationFailedException::class);
        $response = $this->makeResponse([
            'usage' => ['inputTokens' => 10, 'outputTokens' => 200, 'totalTokens' => 210],
        ]);
        $this->assertLlmRespondsWithinTokens($response, 50);
    }
}
