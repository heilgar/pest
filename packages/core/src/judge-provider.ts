import type { Provider } from './types.js';

let judgeProvider: Provider | null = null;

export function setJudge(provider: Provider): void {
  judgeProvider = provider;
}

export function getJudge(): Provider | null {
  return judgeProvider;
}

export function resolveJudge(options?: { judge?: Provider }): Provider {
  const judge = options?.judge ?? judgeProvider;
  if (!judge) {
    throw new Error(
      'No judge provider configured. Set judge in pest.config.ts or call setJudge(), or pass { judge } in matcher options.',
    );
  }
  return judge;
}
