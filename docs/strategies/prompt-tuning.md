::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# Prompt Tuning

Automatically improve and compress your prompts. pest uses an LLM to generate prompt variants, tests them against your existing test suite, and iteratively converges on the best-performing, most token-efficient version.

## How it works

1. Provide the original prompt and a test block
2. The tuner LLM suggests improved variants
3. pest runs all variants against your tests (including tool call matchers)
4. The best variant becomes the base for the next iteration
5. Compressor optionally reduces token count while preserving quality

## Optimizer

<PluginBlock plugin="vitest">

```typescript
import { optimizePrompt } from '@pest/vitest'

const result = await optimizePrompt(tunerProvider, originalPrompt, block, provider, {
  maxIterations: 5,
  variants: 3,
  temperature: 0.7,
})

console.log(result.best.prompt)     // Best prompt found
console.log(result.best.passRate)   // e.g. 0.95
console.log(result.best.tokenCount)
console.log(result.improved)        // true if better than original
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { optimizePrompt } from '@pest/jest'

const result = await optimizePrompt(tunerProvider, originalPrompt, block, provider, {
  maxIterations: 5,
  variants: 3,
  temperature: 0.7,
})

console.log(result.best.prompt)
console.log(result.best.passRate)
console.log(result.improved)
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from pest_pytest import optimize_prompt

result = await optimize_prompt(tuner_provider, original_prompt, block, provider,
    max_iterations=5,
    variants=3,
    temperature=0.7,
)

print(result.best.prompt)      # Best prompt found
print(result.best.pass_rate)   # e.g. 0.95
print(result.improved)         # True if better than original
```

</PluginBlock>

The optimizer stops early if 100% pass rate is achieved.

## Compressor

<PluginBlock plugin="vitest">

```typescript
import { compressPrompt } from '@pest/vitest'

const result = await compressPrompt(compressorProvider, originalPrompt, block, provider, {
  targetReduction: 0.3,
  maxIterations: 3,
  minPassRate: 1,
})

console.log(result.compressed.prompt)
console.log(result.reductionPercent)     // e.g. 28.5
console.log(result.passRateMaintained)   // true
```

</PluginBlock>

<PluginBlock plugin="jest">

```typescript
import { compressPrompt } from '@pest/jest'

const result = await compressPrompt(compressorProvider, originalPrompt, block, provider, {
  targetReduction: 0.3,
  maxIterations: 3,
  minPassRate: 1,
})

console.log(result.compressed.prompt)
console.log(result.reductionPercent)
console.log(result.passRateMaintained)
```

</PluginBlock>

<PluginBlock plugin="pytest">

```python
from pest_pytest import compress_prompt

result = await compress_prompt(compressor_provider, original_prompt, block, provider,
    target_reduction=0.3,
    max_iterations=3,
    min_pass_rate=1.0,
)

print(result.compressed.prompt)
print(result.reduction_percent)      # e.g. 28.5
print(result.pass_rate_maintained)   # True
```

</PluginBlock>

## Custom tuner prompts

<PluginBlock :plugins="['vitest', 'jest']">

```typescript
export default defineConfig({
  providers: [...],
  prompts: {
    optimizer: `You are a prompt engineer specializing in customer support.
Focus on clarity and tool usage accuracy.
Return ONLY a JSON array of improved prompt strings.`,
    compressor: `Compress the prompt. Preserve all tool-calling instructions.
Return ONLY the compressed text.`,
  },
})
```

</PluginBlock>

<PluginBlock plugin="pytest">

```yaml
prompts:
  optimizer: |
    You are a prompt engineer specializing in customer support.
    Focus on clarity and tool usage accuracy.
    Return ONLY a JSON array of improved prompt strings.
  compressor: |
    Compress the prompt. Preserve all tool-calling instructions.
    Return ONLY the compressed text.
```

</PluginBlock>

## Example flow

```
Original: 156 tokens | Pass rate: 80%

Round 1 (3 variants):
  A: 148 tokens | 85%
  B: 161 tokens | 90%  <- best
  C: 139 tokens | 75%

Round 2 (3 variants from B):
  B1: 155 tokens | 95%  <- best
  B2: 142 tokens | 90%
  B3: 158 tokens | 85%

Round 3 (3 variants from B1):
  B1a: 149 tokens | 100%  <- converged

Compression:
  149 tokens -> 108 tokens (28% reduction)
  Pass rate maintained: 100%

Results:
  Original:   156 tokens | 80%
  Optimized:  149 tokens | 100%
  Compressed: 108 tokens | 100% (-31% tokens)
```
