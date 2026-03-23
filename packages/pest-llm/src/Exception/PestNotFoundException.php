<?php

declare(strict_types=1);

namespace PestLlm\Exception;

class PestNotFoundException extends PestCliException
{
    public function __construct()
    {
        parent::__construct(
            "pest CLI not found. Install it:\n" .
            "  npm install -D @heilgar/pest-cli\n" .
            "Or set PEST_CLI_PATH environment variable."
        );
    }
}
