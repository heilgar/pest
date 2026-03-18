export interface ModelPricing {
  inputCentsPer1M: number;
  outputCentsPer1M: number;
}

const defaultPricing: Record<string, ModelPricing> = {
  'gpt-4o': { inputCentsPer1M: 250, outputCentsPer1M: 1000 },
  'gpt-4o-mini': { inputCentsPer1M: 15, outputCentsPer1M: 60 },
  'gpt-4.1': { inputCentsPer1M: 200, outputCentsPer1M: 800 },
  'gpt-4.1-mini': { inputCentsPer1M: 40, outputCentsPer1M: 160 },
  'gpt-4.1-nano': { inputCentsPer1M: 10, outputCentsPer1M: 40 },
  o1: { inputCentsPer1M: 1500, outputCentsPer1M: 6000 },
  'o1-mini': { inputCentsPer1M: 110, outputCentsPer1M: 440 },
  'o3-mini': { inputCentsPer1M: 110, outputCentsPer1M: 440 },
  'claude-sonnet-4-20250514': { inputCentsPer1M: 300, outputCentsPer1M: 1500 },
  'claude-opus-4-20250514': { inputCentsPer1M: 1500, outputCentsPer1M: 7500 },
  'claude-haiku-3-5-20241022': { inputCentsPer1M: 80, outputCentsPer1M: 400 },
  'gemini-2.5-flash': { inputCentsPer1M: 15, outputCentsPer1M: 60 },
  'gemini-2.5-pro': { inputCentsPer1M: 125, outputCentsPer1M: 1000 },
  'gemini-2.0-flash': { inputCentsPer1M: 10, outputCentsPer1M: 40 },
  'grok-3': { inputCentsPer1M: 300, outputCentsPer1M: 1500 },
  'grok-3-mini': { inputCentsPer1M: 30, outputCentsPer1M: 50 },
};

let customPricing: Record<string, ModelPricing> = {};

export function setPricing(pricing: Record<string, ModelPricing>): void {
  customPricing = { ...customPricing, ...pricing };
}

export function resetPricing(): void {
  customPricing = {};
}

export function getPricing(model: string): ModelPricing {
  // Exact match first
  const exact = customPricing[model] ?? defaultPricing[model];
  if (exact) return exact;

  // Prefix match (e.g. "gpt-4o-2024-08-06" matches "gpt-4o")
  const allPricing = { ...defaultPricing, ...customPricing };
  for (const [key, pricing] of Object.entries(allPricing)) {
    if (model.startsWith(key)) return pricing;
  }

  return { inputCentsPer1M: 1000, outputCentsPer1M: 3000 };
}

export function estimateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = getPricing(model);
  return (
    (inputTokens / 1_000_000) * pricing.inputCentsPer1M +
    (outputTokens / 1_000_000) * pricing.outputCentsPer1M
  );
}
