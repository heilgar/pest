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

const McpStdioServerSchema = v.object({
  command: v.string(),
  args: v.optional(v.array(v.string())),
  env: v.optional(v.record(v.string(), v.string())),
});

const McpSseServerSchema = v.object({
  transport: v.literal('sse'),
  url: v.string(),
  headers: v.optional(v.record(v.string(), v.string())),
});

const McpHttpServerSchema = v.object({
  transport: v.literal('http'),
  url: v.string(),
  headers: v.optional(v.record(v.string(), v.string())),
});

const McpServerConfigSchema = v.union([
  McpStdioServerSchema,
  McpSseServerSchema,
  McpHttpServerSchema,
]);

const McpConfigSchema = v.object({
  servers: v.record(v.string(), McpServerConfigSchema),
});

export const PestConfigSchema = v.object({
  providers: v.pipe(v.array(ProviderConfigSchema), v.minLength(1)),
  judge: v.optional(JudgeConfigSchema),
  pricing: v.optional(v.record(v.string(), ModelPricingSchema)),
  mcp: v.optional(McpConfigSchema),
});

export type PestConfig = v.InferOutput<typeof PestConfigSchema>;
export type ProviderConfig = v.InferOutput<typeof ProviderConfigSchema>;
export type McpServerConfigFromSchema = v.InferOutput<typeof McpServerConfigSchema>;
export type McpConfigFromSchema = v.InferOutput<typeof McpConfigSchema>;
