<?php

declare(strict_types=1);

namespace PestLlm\Trait;

use PestLlm\PestLlm;
use PestLlm\Response;

trait AssertLlm
{
    // --- Deterministic matchers (run locally in PHP) ---

    public function assertLlmContainsText(Response $response, string $text, string $message = ''): void
    {
        $haystack = strtolower($response->text);
        $needle = strtolower($text);

        static::assertTrue(
            str_contains($haystack, $needle),
            $message ?: "Expected LLM response to contain \"{$text}\", but it doesn't.\nResponse: \"" . substr($response->text, 0, 200) . '"'
        );
    }

    public function assertLlmNotContainsText(Response $response, string $text, string $message = ''): void
    {
        $haystack = strtolower($response->text);
        $needle = strtolower($text);

        static::assertFalse(
            str_contains($haystack, $needle),
            $message ?: "Expected LLM response NOT to contain \"{$text}\", but it does."
        );
    }

    public function assertLlmContainsToolCall(Response $response, string $name, ?array $args = null, string $message = ''): void
    {
        $call = null;
        foreach ($response->toolCalls as $tc) {
            if ($tc['name'] === $name) {
                $call = $tc;
                break;
            }
        }

        static::assertNotNull(
            $call,
            $message ?: "Expected tool \"{$name}\" to be called, but it was not. Called: [" . implode(', ', array_map(fn($tc) => $tc['name'], $response->toolCalls)) . ']'
        );

        if ($args !== null && $call !== null) {
            static::assertTrue(
                self::deepPartialMatch($call['args'], $args),
                $message ?: "Expected tool \"{$name}\" to be called with args matching " . json_encode($args) . ', got ' . json_encode($call['args'])
            );
        }
    }

    private static function deepPartialMatch(mixed $actual, mixed $expected): bool
    {
        if ($actual === $expected) {
            return true;
        }
        if (!is_array($expected) || !is_array($actual)) {
            return $actual === $expected;
        }
        if (array_is_list($expected)) {
            if (!array_is_list($actual) || count($actual) !== count($expected)) {
                return false;
            }
            foreach ($expected as $i => $item) {
                if (!self::deepPartialMatch($actual[$i], $item)) {
                    return false;
                }
            }
            return true;
        }
        foreach ($expected as $key => $value) {
            if (!array_key_exists($key, $actual)) {
                return false;
            }
            if (!self::deepPartialMatch($actual[$key], $value)) {
                return false;
            }
        }
        return true;
    }

    public function assertLlmCallsToolsInOrder(Response $response, array $names, string $message = ''): void
    {
        if ($names === []) {
            return;
        }

        $actual = array_map(fn($tc) => $tc['name'], $response->toolCalls);
        $expectedIdx = 0;

        foreach ($actual as $name) {
            if ($name === $names[$expectedIdx]) {
                $expectedIdx++;
                if ($expectedIdx === count($names)) {
                    break;
                }
            }
        }

        static::assertSame(
            count($names),
            $expectedIdx,
            $message ?: 'Expected tools to be called in order [' . implode(', ', $names) . '], but got [' . implode(', ', $actual) . '].'
        );
    }

    public function assertLlmHasToolCallCount(Response $response, int $count, string $message = ''): void
    {
        $actual = count($response->toolCalls);

        static::assertSame(
            $count,
            $actual,
            $message ?: "Expected {$count} tool calls, but got {$actual}."
        );
    }

    public function assertLlmRespondsWithinTokens(Response $response, int $maxTokens, string $message = ''): void
    {
        $actual = $response->usage['outputTokens'] ?? 0;

        static::assertLessThanOrEqual(
            $maxTokens,
            $actual,
            $message ?: "Expected response within {$maxTokens} tokens, but got {$actual} tokens."
        );
    }

    // --- Delegated matchers (run via CLI) ---

    public function assertLlmMatchesResponseSchema(Response $response, array $schema, string $message = ''): void
    {
        $result = PestLlm::evaluate('matchesResponseSchema', $response, ['schema' => $schema]);

        static::assertTrue(
            $result->pass,
            $message ?: $result->message
        );
    }

    // --- LLM-judged matchers (run via CLI) ---

    public function assertLlmSatisfiesCriteria(Response $response, string|array $rubric, ?string $judge = null, string $message = ''): void
    {
        $args = is_string($rubric) ? ['rubric' => $rubric] : $rubric;
        $result = PestLlm::evaluate('satisfiesCriteria', $response, $args, $judge);

        static::assertTrue(
            $result->pass,
            $message ?: $result->message
        );
    }

    public function assertLlmMatchesSemanticMeaning(Response $response, string $expected, ?string $judge = null, ?int $threshold = null, string $message = ''): void
    {
        $args = ['expected' => $expected];
        if ($threshold !== null) {
            $args['threshold'] = $threshold;
        }

        $result = PestLlm::evaluate('matchesSemanticMeaning', $response, $args, $judge);

        static::assertTrue(
            $result->pass,
            $message ?: $result->message
        );
    }

    public function assertLlmClassifiedAs(Response $response, string $label, ?string $judge = null, ?array $categories = null, string $message = ''): void
    {
        $args = ['label' => $label];
        if ($categories !== null) {
            $args['categories'] = $categories;
        }

        $result = PestLlm::evaluate('classifiedAs', $response, $args, $judge);

        static::assertTrue(
            $result->pass,
            $message ?: $result->message
        );
    }

    public function assertLlmDoesNotDisclose(Response $response, string $topic, ?string $judge = null, string $message = ''): void
    {
        $result = PestLlm::evaluate('doesNotDisclose', $response, ['topic' => $topic], $judge);

        static::assertTrue(
            $result->pass,
            $message ?: $result->message
        );
    }
}
