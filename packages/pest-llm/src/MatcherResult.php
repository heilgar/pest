<?php

declare(strict_types=1);

namespace PestLlm;

final class MatcherResult
{
    public function __construct(
        public readonly bool $pass,
        public readonly string $message,
        public readonly ?float $score = null,
        public readonly ?string $reasoning = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            pass: $data['pass'] ?? false,
            message: $data['message'] ?? '',
            score: isset($data['score']) ? (float) $data['score'] : null,
            reasoning: $data['reasoning'] ?? null,
        );
    }
}
