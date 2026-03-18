import * as v from 'valibot';

const ProviderConfigSchema = v.object({
  name: v.string(),
  type: v.picklist(['openai', 'anthropic', 'gemini', 'xai', 'ollama']),
  model: v.string(),
  apiKey: v.optional(v.string()),
  baseUrl: v.optional(v.string()),
  temperature: v.optional(v.number()),
});

const JudgeConfigSchema = v.object({
  provider: v.string(),
});

const ModelPricingSchema = v.object({
  inputCentsPer1M: v.number(),
  outputCentsPer1M: v.number(),
});

export const PestConfigSchema = v.object({
  providers: v.pipe(v.array(ProviderConfigSchema), v.minLength(1)),
  judge: v.optional(JudgeConfigSchema),
  pricing: v.optional(v.record(v.string(), ModelPricingSchema)),
});

export type PestConfig = v.InferOutput<typeof PestConfigSchema>;
export type ProviderConfig = v.InferOutput<typeof ProviderConfigSchema>;
