<?php

declare(strict_types=1);

namespace PestLlm\Bridge;

use PestLlm\Exception\PestCliException;
use PestLlm\Exception\PestNotFoundException;
use PestLlm\Exception\PestTimeoutException;

final class CliBridge
{
    /** @var string[]|null */
    private ?array $binaryPath = null;
    private int $timeout;

    public function __construct(
        private readonly ?string $configPath = null,
        int $timeout = 30,
    ) {
        $this->timeout = $timeout;
    }

    public function execute(array $request): array
    {
        $binary = $this->resolveBinary();
        $request['version'] = '1';

        $cmd = $binary;
        $cmd[] = 'exec';
        if ($this->configPath !== null) {
            $cmd[] = '--config';
            $cmd[] = $this->configPath;
        }

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($cmd, $descriptors, $pipes);

        if (!is_resource($process)) {
            throw new PestCliException('Failed to start pest CLI process.');
        }

        fwrite($pipes[0], json_encode($request, JSON_THROW_ON_ERROR));
        fclose($pipes[0]);

        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $stdout = '';
        $stderr = '';
        $startTime = microtime(true);

        while (true) {
            $status = proc_get_status($process);

            $stdout .= stream_get_contents($pipes[1]) ?: '';
            $stderr .= stream_get_contents($pipes[2]) ?: '';

            if (!$status['running']) {
                $stdout .= stream_get_contents($pipes[1]) ?: '';
                $stderr .= stream_get_contents($pipes[2]) ?: '';
                break;
            }

            if ((microtime(true) - $startTime) >= $this->timeout) {
                proc_terminate($process, 9);
                fclose($pipes[1]);
                fclose($pipes[2]);
                proc_close($process);
                throw new PestTimeoutException(
                    "pest CLI timed out after {$this->timeout}s.",
                    $stderr
                );
            }

            usleep(10_000);
        }

        fclose($pipes[1]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        if ($exitCode !== 0) {
            throw new PestCliException(
                "pest CLI exited with code {$exitCode}: " . ($stderr ?: $stdout),
                $stderr ?: ''
            );
        }

        if ($stdout === false || $stdout === '') {
            throw new PestCliException('pest CLI returned empty output.', $stderr ?: '');
        }

        try {
            $response = json_decode($stdout, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new PestCliException(
                "Failed to parse pest CLI output: {$e->getMessage()}\nOutput: " . substr($stdout, 0, 500),
                $stderr ?: ''
            );
        }

        if (!($response['success'] ?? false)) {
            $error = $response['error'] ?? ['code' => 'UNKNOWN', 'message' => 'Unknown error'];
            throw new PestCliException(
                "[{$error['code']}] {$error['message']}",
                $stderr ?: ''
            );
        }

        return $response;
    }

    /** @return string[] */
    private function resolveBinary(): array
    {
        if ($this->binaryPath !== null) {
            return $this->binaryPath;
        }

        $envPath = getenv('PEST_CLI_PATH');
        if ($envPath !== false && $envPath !== '' && $this->isExecutable($envPath)) {
            $this->binaryPath = [$envPath];
            return $this->binaryPath;
        }

        $localBin = getcwd() . '/node_modules/.bin/pest';
        if ($this->isExecutable($localBin)) {
            $this->binaryPath = [$localBin];
            return $this->binaryPath;
        }

        $npxPath = $this->which('npx');
        if ($npxPath !== null) {
            $this->binaryPath = [$npxPath, '--yes', '@heilgar/pest-cli'];
            return $this->binaryPath;
        }

        throw new PestNotFoundException();
    }

    private function isExecutable(string $path): bool
    {
        return file_exists($path) && is_executable($path);
    }

    private function which(string $command): ?string
    {
        $process = proc_open(
            ['which', $command],
            [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
        );

        if (!is_resource($process)) {
            return null;
        }

        $result = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);

        return $exitCode === 0 && $result !== false && $result !== ''
            ? trim($result)
            : null;
    }
}
