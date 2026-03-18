import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/setup.ts', 'src/plugin.ts', 'src/reporter.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'es2022',
  splitting: true,
});
