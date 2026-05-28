<?php

declare(strict_types=1);

namespace PestLlm;

use PestLlm\Bridge\CliBridge;

final class PestLlm
{
    private static ?CliBridge $bridge = null;

    public static function configure(?string $configPath = null, int $timeout = 30): void
    {
        self::$bridge = new CliBridge($configPath, $timeout);
    }

    private static function bridge(): CliBridge
    {
        if (self::$bridge === null) {
            self::$bridge = new CliBridge();
        }
        return self::$bridge;
    }

    public static function send(string $message, array $options = []): Response
    {
        $params = array_merge($options, ['message' => $message]);

        $response = self::bridge()->execute([
            'method' => 'send',
            'params' => $params,
        ]);

        return Response::fromArray($response['result']);
    }

    public static function sendWithMcp(string $message, array $options = []): Response
    {
        $params = array_merge($options, ['message' => $message]);

        $response = self::bridge()->execute([
            'method' => 'sendWithMcp',
            'params' => $params,
        ]);

        return Response::fromArray($response['result']);
    }

    public static function evaluate(
        string $matcher,
        Response $response,
        array $args = [],
        ?string $judge = null,
    ): MatcherResult {
        $params = [
            'matcher' => $matcher,
            'response' => $response->toArray(),
            'args' => $args,
        ];

        if ($judge !== null) {
            $params['judge'] = $judge;
        }

        $result = self::bridge()->execute([
            'method' => 'match',
            'params' => $params,
        ]);

        return MatcherResult::fromArray($result['result']);
    }

    public static function reset(): void
    {
        self::$bridge = null;
    }
}
