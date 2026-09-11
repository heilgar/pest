import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 60_000,
  webServer: {
    command: 'npx tsx src/server.ts',
    port: 3210,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:3210',
  },
});
