::: danger OUTDATED
This page is outdated and does not reflect the current architecture. See [Architecture](/architecture/packages) and [Matchers](/architecture/matchers) for the current documentation.
:::

# Expect Matchers

pest extends `expect()` with matchers designed for LLM response evaluation. All matchers work on the `PestResponse` object returned by `send()`.

```typescript
const res = await send('Hello')
expect(res).toContain('hello')
```

## Text matchers

### `toContain(substring)`

Check that the response text contains a substring (case-insensitive).

```typescript
expect(res).toContain('Paris')
expect(res).not.toContain('error')
```

### `toMatch(pattern)`

Check that the response text matches a regex.

```typescript
expect(res).toMatch(/\d{4}-\d{2}-\d{2}/)  // Date pattern
expect(res).not.toMatch(/error|fail|crash/i)
```

### `toEqual(expected)`

Exact text match (trimmed).

```typescript
expect(res).toEqual('42')
```

### `toHaveLength(options)`

Check response length.

```typescript
expect(res).toHaveLength({ min: 50 })
expect(res).toHaveLength({ max: 500 })
expect(res).toHaveLength({ min: 50, max: 500 })
```

## Tool call matchers

See [Tool Call Testing](/strategies/tool-call-testing) for detailed examples.

### `toCallTool(name)`

Assert a tool was called at least once.

```typescript
expect(res).toCallTool('process_refund')
expect(res).not.toCallTool('escalate')
```

### `toCallAnyTool()`

Assert that at least one tool was called.

```typescript
expect(res).toCallAnyTool()
expect(res).not.toCallAnyTool()  // No tools should be called
```

### `toCallToolWith(name, args)`

Assert **exact** argument match — the tool must have been called with exactly these arguments and no extra keys.

```typescript
expect(res).toCallToolWith('process_refund', {
  order_id: '12345',
  reason: 'damaged',
})
```

### `toCallToolWithMatch(name, partialArgs)`

Assert arguments **partially** match — only the specified fields are checked, extra keys in the actual call are ignored.

```typescript
expect(res).toCallToolWithMatch('process_refund', {
  order_id: '12345',
  // Don't care about 'reason'
})
```

### `toHaveToolCallCount(n)`

Assert the total number of tool calls.

```typescript
expect(res).toHaveToolCallCount(1)
expect(res).toHaveToolCallCount(0)  // Same as not.toCallAnyTool()
```

### `toCallToolsInOrder(names)`

Assert tools were called in a specific sequence. Allows other calls between them (subsequence matching).

```typescript
expect(res).toCallToolsInOrder(['check_order_status', 'process_refund'])
```

### `toCallToolAtIndex(index, name, args?)`

Assert a specific tool call by its position.

```typescript
expect(res).toCallToolAtIndex(0, 'search_flights')
expect(res).toCallToolAtIndex(1, 'book_flight', { flight_id: 'FL123' })
```

## Response metadata matchers

### `toRespondWithin(ms)`

Assert response time.

```typescript
expect(res).toRespondWithin(5000)  // Under 5 seconds
```

### `toCostLessThan(dollars)`

Assert estimated cost (rough estimate based on token usage).

```typescript
expect(res).toCostLessThan(0.05)  // Under $0.05
```

## Judge matchers

These matchers use an LLM to evaluate the response. They are **async** — you must `await` them.

### `toPassJudge(criteria, options?)`

Score the response against natural-language criteria.

```typescript
await expect(res).toPassJudge('Response is factually correct and concise')
```

With custom threshold (default is 0.7):

```typescript
await expect(res).toPassJudge('Response is empathetic', { threshold: 0.9 })
```

### `toBeSemanticallySimilar(expected, options?)`

Check semantic similarity to expected text (not string matching).

```typescript
await expect(res).toBeSemanticallySimilar(
  'The capital of France is Paris, located in the north of the country.',
  { threshold: 0.8 },
)
```

## Negation

All matchers support `.not`:

```typescript
expect(res).not.toContain('error')
expect(res).not.toCallTool('delete_account')
expect(res).not.toCallAnyTool()
expect(res).not.toMatch(/sorry|unfortunately/i)
await expect(res).not.toPassJudge('Contains harmful content')
```

## Chaining

Multiple `expect` calls on the same response:

```typescript
const res = await send('Refund order #12345, damaged item')

// All must pass for the test to pass
expect(res).toCallTool('process_refund')
expect(res).toCallToolWith('process_refund', { order_id: '12345' })
expect(res).not.toCallTool('escalate')
expect(res).toContain('refund')
expect(res).not.toContain('unable')
await expect(res).toPassJudge('Polite and confirms refund is being processed')
```

## Matcher reference

| Matcher | Sync/Async | Description |
|---------|-----------|-------------|
| `toContain(str)` | Sync | Text contains substring (case-insensitive) |
| `toMatch(regex)` | Sync | Text matches pattern |
| `toEqual(str)` | Sync | Exact text match (trimmed) |
| `toHaveLength({ min?, max? })` | Sync | Text length bounds |
| `toRespondWithin(ms)` | Sync | Response time check |
| `toCostLessThan(dollars)` | Sync | Cost estimate check |
| `toCallTool(name)` | Sync | Tool was called |
| `toCallAnyTool()` | Sync | Any tool was called |
| `toCallToolWith(name, args)` | Sync | Tool called with exact args (no extra keys) |
| `toCallToolWithMatch(name, partial)` | Sync | Tool called with matching subset of args |
| `toHaveToolCallCount(n)` | Sync | Number of tool calls |
| `toCallToolsInOrder(names)` | Sync | Tools called in sequence |
| `toCallToolAtIndex(i, name, args?)` | Sync | Specific tool call by index |
| `toPassJudge(criteria)` | **Async** | LLM judges response quality |
| `toBeSemanticallySimilar(text)` | **Async** | Semantic similarity check |
