# Prompt Tuning

Automatically improve and compress your prompts. pest uses an LLM to generate prompt variants, tests them against your existing test suite, and iteratively converges on the best-performing, most token-efficient version.

## How it works

1. Provide the original prompt and a test file
2. The tuner LLM suggests improved variants
3. pest runs all variants against your tests (including tool call matchers)
4. The best variant becomes the base for the next iteration
5. Compressor optionally reduces token count while preserving quality

## Usage

### CLI

```bash
# Tune a prompt using tests from a file
npx pest tune tests/support.pest.ts

# More iterations
npx pest tune tests/support.pest.ts --iterations 10

# Evolutionary strategy (explores more variations)
npx pest tune tests/support.pest.ts --strategy evolutionary

# Tune and compress
npx pest tune tests/support.pest.ts --compress --target 0.5

# Show diff between original and optimized
npx pest tune tests/support.pest.ts --diff

# Save optimized prompt to file
npx pest tune tests/support.pest.ts --save src/prompts/support-optimized.ts
```

### Programmatic

```typescript
import { tune } from 'pest';

const result = await tune({
  tests: './tests/support.pest.ts',
  iterations: 5,
  compress: true,
  compressionTarget: 0.6,
});

console.log(result.optimized.prompt);
console.log(result.optimized.score);   // 0.91
console.log(result.optimized.tokens);  // 149

console.log(result.compressed.prompt);
console.log(result.compressed.score);  // 0.89
console.log(result.compressed.tokens); // 108
```

## Strategies

### Iterative

Takes the best prompt from each round, asks the tuner to improve it. Focused and predictable.

```
Round 1: Original -> 3 variants
  Best: B (score: 0.88)
Round 2: B -> 3 variants
  Best: B2 (score: 0.91)
Round 3: B2 -> 3 variants
  Best: B2a (score: 0.93, converged)
```

### Evolutionary

Maintains a pool of variants. Mutates top performers, drops worst. More exploration.

```
Round 1: [A, B, C, D, E] -> keep B, D, A
Round 2: [B1, B2, D1, D2, A1] -> keep D1, B1, B2
...
```

## Output

```
pest Tuner - Support Agent

Original: 156 tokens | Score: 0.82

Round 1:
  A: 148 tokens | 0.85 | tools: 15/15
  B: 161 tokens | 0.88 | tools: 15/15
  C: 139 tokens | 0.80 | tools: 14/15    <- dropped (tool regression)
  Winner: B

Round 2:
  B1: 155 tokens | 0.90 | tools: 15/15
  B2: 142 tokens | 0.89 | tools: 15/15
  Winner: B1

Round 3:
  B1a: 149 tokens | 0.91 | tools: 15/15  <- converged
  Winner: B1a

Compression: 149 -> 108 tokens (72% of original)
  Compressed score: 0.89 | tools: 15/15

Results:
  Original:   156 tokens | 0.82
  Optimized:  149 tokens | 0.91 (+0.09)
  Compressed: 108 tokens | 0.89 (+0.07, -31% tokens)
```

## Tool behavior preservation

With `preserveToolBehavior: true` (default), variants that break tool call assertions are discarded even if their judge score improves.

```typescript
// pest.config.ts
tuner: {
  provider: 'claude-sonnet',
  preserveToolBehavior: true,  // Default
}
```

## Diff view

```bash
npx pest tune tests/support.pest.ts --diff
```

```diff
- You are a customer support agent for Acme Inc.
- Your role is to help customers with their orders, process refunds for
- damaged or late items, and escalate complex issues to human agents.
- Always maintain a polite and professional tone.
- When processing refunds, always ask for the order ID and reason.
- Never process refunds over $500 without escalation.
- For order lookups, use the order ID provided by the customer.
+ Acme Inc. support agent. Help with orders, refunds (damaged/late items),
+ and escalations. Be polite and professional.
+ Refunds: require order ID and reason. Escalate if >$500.
+ Order lookups: use customer-provided order ID.
```

## Configuration

```typescript
// pest.config.ts
export default defineConfig({
  tuner: {
    provider: 'claude-sonnet',
    maxIterations: 5,
    compressionTarget: 0.7,    // Target 70% of original tokens
    strategy: 'iterative',     // 'iterative' | 'evolutionary'
    preserveToolBehavior: true,
    minScore: 0.85,            // Stop compressing if score drops below this
  },
});
```
