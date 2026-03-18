import { expect } from '@playwright/test';
import { pestMatchers } from './matchers.js';

// biome-ignore lint/suspicious/noExplicitAny: Playwright's expect.extend() typing requires any
expect.extend(pestMatchers as any);
