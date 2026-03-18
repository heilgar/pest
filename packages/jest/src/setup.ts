import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  endTest,
  getAllTestData,
  getTestData,
  onSend,
  recordSend,
  startTest,
} from '@heilgar/pest-core';
import { getActiveTestId, setActiveTestId } from './context.js';
import { pestMatchers } from './matchers.js';

// Jest provides expect/beforeEach/afterEach/afterAll globally at runtime
declare const expect: {
  extend: (matchers: Record<string, unknown>) => void;
  getState: () => { currentTestName?: string };
};
declare function beforeEach(fn: () => void): void;
declare function afterEach(fn: () => void): void;
declare function afterAll(fn: () => void): void;

expect.extend(pestMatchers as Record<string, unknown>);

const PEST_DATA_DIR = resolve(
  process.cwd(),
  'node_modules',
  '.cache',
  'pest-jest',
);

// Wire send() calls to the accumulator
onSend((entry) => {
  const testId = getActiveTestId();
  if (testId) {
    recordSend(testId, entry);
  }
});

let testCounter = 0;

beforeEach(() => {
  const testId = `pest-jest-${++testCounter}`;
  const testName = expect.getState().currentTestName ?? testId;
  setActiveTestId(testId);
  startTest(testId, testName);
});

afterEach(() => {
  const testId = getActiveTestId();
  if (testId) {
    const data = getTestData(testId);
    if (data) {
      data.testName = expect.getState().currentTestName ?? data.testName;
    }
    endTest(testId);
  }
  setActiveTestId(undefined);
});

// Write accumulated test data to disk so the reporter (in the main process) can read it
afterAll(() => {
  const allData = getAllTestData();
  if (allData.size === 0) return;

  mkdirSync(PEST_DATA_DIR, { recursive: true });
  const filename = `worker-${process.pid}-${Date.now()}.json`;
  const serialized: Record<string, unknown> = {};
  for (const [id, data] of allData) {
    serialized[id] = data;
  }
  writeFileSync(resolve(PEST_DATA_DIR, filename), JSON.stringify(serialized));
});
