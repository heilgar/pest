import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { EvalOutput } from './types.js';

export function writeEvalJson(output: EvalOutput, filePath: string): void {
  const absPath = resolve(process.cwd(), filePath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, JSON.stringify(output, null, 2));
}
