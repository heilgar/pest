import { ref, watch } from 'vue';

export type Extension = 'vitest' | 'jest' | 'playwright';

const STORAGE_KEY = 'pest-extension';
const VALID_EXTENSIONS: Extension[] = ['vitest', 'jest', 'playwright'];

// Module-level singleton — shared across all components
export const selectedExtension = ref<Extension>('vitest');

let initialized = false;

export function useExtension() {
  if (typeof window !== 'undefined' && !initialized) {
    initialized = true;
    const stored = localStorage.getItem(STORAGE_KEY) as Extension | null;
    if (stored && VALID_EXTENSIONS.includes(stored)) {
      selectedExtension.value = stored;
    }
    watch(selectedExtension, (val) => {
      localStorage.setItem(STORAGE_KEY, val);
    });
  }
  return { selectedExtension };
}
