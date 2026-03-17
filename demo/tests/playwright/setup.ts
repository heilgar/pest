import { loadEnv, createProvider } from '@heilgar/pest-core';
import { pestMatchers, setJudge } from '@heilgar/pest-playwright';
import { expect } from '@playwright/test';

loadEnv();
expect.extend(pestMatchers as any);

if (process.env.OPENAI_API_KEY) {
  setJudge(createProvider({ name: 'judge', type: 'openai', model: 'gpt-4o-mini' }));
}
