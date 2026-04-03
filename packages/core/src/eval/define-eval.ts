import type { EvalSuiteFactory } from './types.js';

export function defineEval(factory: EvalSuiteFactory): EvalSuiteFactory {
  return factory;
}
