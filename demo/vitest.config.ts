import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/vitest/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30_000,
    reporters: ['default', '@heilgar/pest-vitest/reporter'],
  },
});
