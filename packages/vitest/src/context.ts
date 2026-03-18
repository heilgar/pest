import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage<string | undefined>();

export function setActiveTestId(id: string | undefined): void {
  storage.enterWith(id);
}

export function getActiveTestId(): string | undefined {
  return storage.getStore();
}
