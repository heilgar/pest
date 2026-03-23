<?php

declare(strict_types=1);

namespace PestLlm;

final class Response
{
    public readonly array $toolCalls;
    public readonly array $usage;

    public function __construct(
        public readonly string $text,
        array $toolCalls,
        array $usage,
        public readonly int $latencyMs,
        public readonly string $provider,
        public readonly string $model,
    ) {
        $this->toolCalls = $toolCalls;
        $this->usage = $usage;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            text: $data['text'] ?? '',
            toolCalls: $data['toolCalls'] ?? [],
            usage: $data['usage'] ?? ['inputTokens' => 0, 'outputTokens' => 0, 'totalTokens' => 0],
            latencyMs: $data['latencyMs'] ?? 0,
            provider: $data['provider'] ?? '',
            model: $data['model'] ?? '',
        );
    }

    public function toArray(): array
    {
        return [
            'text' => $this->text,
            'toolCalls' => $this->toolCalls,
            'usage' => $this->usage,
            'latencyMs' => $this->latencyMs,
            'provider' => $this->provider,
            'model' => $this->model,
        ];
    }
}
