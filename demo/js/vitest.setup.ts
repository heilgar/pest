// Use pest's setup which registers matchers AND reporter hooks
import '@heilgar/pest-vitest/setup';
import '@heilgar/pest-mcp/setup/vitest';
import { loadEnv } from '@heilgar/pest-core';

loadEnv();
