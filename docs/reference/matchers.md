# Expect Matchers

pest extends `expect()` with matchers designed for LLM response evaluation. All matchers work on the `PestResponse` object returned by `send()`.

```typescript
const res = await send('Hello');
expect(res).toContain('hello');
```

## Text matchers

### `toContain(substring)`

Check that the response text contains a substring.

```typescript
expect(res).toContain('Paris');
expect(res).not.toContain('error');
```

Case-insensitive:

```typescript
expect(res).toContain('paris', { caseSensitive: false });
```

### `toMatch(pattern)`

Check that the response text matches a regex.

```typescript
expect(res).toMatch(/\d{4}-\d{2}-\d{2}/);  // Date pattern
expect(res).not.toMatch(/error|fail|crash/i);
```

### `toEqual(expected)`

Exact text match (trimmed).

```typescript
expect(res).toEqual('42');
```

### `toMatchSchema(schema)`

Validate that the response is valid JSON conforming to a schema.

```typescript
expect(res).toMatchSchema({
  type: 'object',
  required: ['name', 'age'],
  properties: {
    name: { type: 'string' },
    age: { type: 'number', minimum: 0 },
  },
});
```

### `toHaveLength(options)`

Check response length.

```typescript
expect(res).toHaveLength({ min: 50 });
expect(res).toHaveLength({ max: 500 });
expect(res).toHaveLength({ min: 50, max: 500 });
```

## Tool call matchers

See [Tool Call Testing]({% link docs/tool-call-testing.md %}) for detailed examples.

### `toCallTool(name)`

Assert a tool was called at least once.

```typescript
expect(res).toCallTool('process_refund');
expect(res).not.toCallTool('escalate');
```

### `toCallAnyTool()`

Assert that at least one tool was called.

```typescript
expect(res).not.toCallAnyTool();  // No tools should be called
```

### `toCallToolWith(name, args)`

Assert exact argument values for a tool call.

```typescript
expect(res).toCallToolWith('process_refund', {
  order_id: '12345',
  reason: 'damaged',
});
```

### `toCallToolWithMatch(name, partialArgs)`

Assert arguments partially match (only specified fields checked).

```typescript
expect(res).toCallToolWithMatch('process_refund', {
  order_id: '12345',
  // Don't care about 'reason'
});
```

Supports regex for values:

```typescript
expect(res).toCallToolWithMatch('create_event', {
  date: /^\d{4}-\d{2}-\d{2}$/,
});
```

### `toCallToolWithSchema(name, schema)`

Assert tool arguments conform to a JSON schema.

```typescript
expect(res).toCallToolWithSchema('send_email', {
  type: 'object',
  required: ['to', 'subject'],
  properties: {
    to: { type: 'string', format: 'email' },
    subject: { type: 'string', minLength: 1 },
  },
});
```

### `toHaveToolCallCount(n)`

Assert the total number of tool calls.

```typescript
expect(res).toHaveToolCallCount(1);
expect(res).toHaveToolCallCount(0);  // Same as not.toCallAnyTool()
```

Per tool:

```typescript
expect(res).toHaveToolCallCount(2, 'send_email');
```

### `toCallToolsInOrder(names)`

Assert tools were called in a specific sequence.

```typescript
expect(res).toCallToolsInOrder(['check_order_status', 'process_refund']);
```

Strict mode (no other calls between):

```typescript
expect(res).toCallToolsInOrder(['check_order_status', 'process_refund'], { strict: true });
```

### `toCallToolAtIndex(index, name, args?)`

Assert a specific tool call by its position.

```typescript
expect(res).toCallToolAtIndex(0, 'search_flights');
expect(res).toCallToolAtIndex(1, 'book_flight', { flight_id: 'FL123' });
```

## Judge matchers

These matchers use an LLM to evaluate the response. They are **async** — you must `await` them.

### `toPassJudge(criteria, options?)`

Score the response against natural-language criteria.

```typescript
await expect(res).toPassJudge('Response is factually correct and concise');
```

With custom threshold (default is 0.7):

```typescript
await expect(res).toPassJudge('Response is empathetic', { threshold: 0.9 });
```

Multiple criteria:

```typescript
await expect(res).toPassJudge([
  'Factually correct',
  'Concise (under 3 sentences)',
  'No hallucination',
], { threshold: 0.8 });
```

Using a specific judge provider:

```typescript
await expect(res).toPassJudge('Sounds natural', {
  provider: 'claude-sonnet',
});
```

### `toBeSemanticallySimilar(expected, options?)`

Check semantic similarity to expected text (not string matching).

```typescript
await expect(res).toBeSemanticallySimilar(
  'The capital of France is Paris, located in the north of the country.',
  { threshold: 0.8 },
);
```

## Response metadata matchers

### `toRespondWithin(ms)`

Assert response time.

```typescript
expect(res).toRespondWithin(5000);  // Under 5 seconds
```

### `toCostLessThan(dollars)`

Assert estimated cost.

```typescript
expect(res).toCostLessThan(0.05);  // Under $0.05
```

## Negation

All matchers support `.not`:

```typescript
expect(res).not.toContain('error');
expect(res).not.toCallTool('delete_account');
expect(res).not.toCallAnyTool();
expect(res).not.toMatch(/sorry|unfortunately/i);
```

## Chaining

Multiple `expect` calls on the same response:

```typescript
const res = await send('Refund order #12345, damaged item');

// All must pass for the test to pass
expect(res).toCallTool('process_refund');
expect(res).toCallToolWith('process_refund', { order_id: '12345' });
expect(res).not.toCallTool('escalate');
expect(res).toContain('refund');
expect(res).not.toContain('unable');
expect(res).toRespondWithin(10_000);
await expect(res).toPassJudge('Polite and confirms refund is being processed');
```

## Matcher reference

| Matcher | Sync/Async | Description |
|---------|-----------|-------------|
| `toContain(str)` | Sync | Text contains substring |
| `toMatch(regex)` | Sync | Text matches pattern |
| `toEqual(str)` | Sync | Exact text match |
| `toMatchSchema(schema)` | Sync | Response is valid JSON matching schema |
| `toHaveLength({ min?, max? })` | Sync | Text length bounds |
| `toCallTool(name)` | Sync | Tool was called |
| `toCallAnyTool()` | Sync | Any tool was called |
| `toCallToolWith(name, args)` | Sync | Tool called with exact args |
| `toCallToolWithMatch(name, partial)` | Sync | Tool called with partial args |
| `toCallToolWithSchema(name, schema)` | Sync | Tool args match schema |
| `toHaveToolCallCount(n, tool?)` | Sync | Number of tool calls |
| `toCallToolsInOrder(names)` | Sync | Tools called in sequence |
| `toCallToolAtIndex(i, name, args?)` | Sync | Specific tool call by index |
| `toPassJudge(criteria)` | **Async** | LLM judges response quality |
| `toBeSemanticallySimilar(text)` | **Async** | Semantic similarity check |
| `toRespondWithin(ms)` | Sync | Response time check |
| `toCostLessThan(dollars)` | Sync | Cost estimate check |
