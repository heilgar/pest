<?php

declare(strict_types=1);

namespace PestLlm\Exception;

use RuntimeException;

class PestCliException extends RuntimeException
{
    public function __construct(string $message, public readonly string $stderr = '')
    {
        parent::__construct($message);
    }
}
