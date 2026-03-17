import { loadEnv } from '@heilgar/pest-core';
import { pestMatchers } from '@heilgar/pest-jest';

loadEnv();
expect.extend(pestMatchers as Record<string, unknown>);
