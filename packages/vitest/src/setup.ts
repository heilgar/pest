import {
  endTest,
  getTestData,
  onSend,
  recordSend,
  startTest,
} from '@heilgar/pest-core';
import { afterEach, beforeEach, expect } from 'vitest';
import { getActiveTestId, setActiveTestId } from './context.js';
import { pestMatchers } from './matchers.js';

expect.extend(pestMatchers);

// Wire send() calls to the accumulator
onSend((entry) => {
  const testId = getActiveTestId();
  if (testId) {
    recordSend(testId, entry);
  }
});

let testCounter = 0;

beforeEach((ctx) => {
  const testId = ctx.task?.id ?? `pest-${++testCounter}`;
  setActiveTestId(testId);
  startTest(testId);
});

afterEach((ctx) => {
  const testId = ctx.task?.id ?? `pest-${testCounter}`;
  endTest(testId);
  const data = getTestData(testId);
  if (data && (data.entries.length > 0 || data.sends.length > 0)) {
    (ctx.task.meta as Record<string, unknown>).pest = data;
  }
  setActiveTestId(undefined);
});
