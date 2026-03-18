import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/setup-vitest.ts',
    'src/setup-jest.ts',
    'src/qa.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'es2022',
  splitting: true,
});
