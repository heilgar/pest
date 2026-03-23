<?php

declare(strict_types=1);

namespace PestLlm\Tests\Unit;

use PestLlm\Response;
use PHPUnit\Framework\TestCase;

final class ResponseTest extends TestCase
{
    public function test_from_array_creates_response(): void
    {
        $response = Response::fromArray([
            'text' => 'Hello world',
            'toolCalls' => [
                ['name' => 'search', 'args' => ['query' => 'test'], 'id' => 'call_1'],
            ],
            'usage' => ['inputTokens' => 10, 'outputTokens' => 5, 'totalTokens' => 15],
            'latencyMs' => 500,
            'provider' => 'openai',
            'model' => 'gpt-4o-mini',
        ]);

        $this->assertSame('Hello world', $response->text);
        $this->assertCount(1, $response->toolCalls);
        $this->assertSame('search', $response->toolCalls[0]['name']);
        $this->assertSame(500, $response->latencyMs);
        $this->assertSame('openai', $response->provider);
    }

    public function test_from_array_with_defaults(): void
    {
        $response = Response::fromArray([]);

        $this->assertSame('', $response->text);
        $this->assertSame([], $response->toolCalls);
        $this->assertSame(0, $response->latencyMs);
    }

    public function test_to_array_round_trips(): void
    {
        $data = [
            'text' => 'Hello',
            'toolCalls' => [['name' => 'search', 'args' => ['q' => 'test']]],
            'usage' => ['inputTokens' => 10, 'outputTokens' => 5, 'totalTokens' => 15],
            'latencyMs' => 100,
            'provider' => 'openai',
            'model' => 'gpt-4o-mini',
        ];

        $response = Response::fromArray($data);
        $array = $response->toArray();

        $this->assertSame($data['text'], $array['text']);
        $this->assertSame($data['toolCalls'], $array['toolCalls']);
        $this->assertSame($data['provider'], $array['provider']);
    }
}
