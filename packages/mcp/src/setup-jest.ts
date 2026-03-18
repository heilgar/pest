import { mcpMatchers } from './matchers.js';

declare const expect: {
  extend: (matchers: Record<string, unknown>) => void;
};

expect.extend(mcpMatchers as Record<string, unknown>);
