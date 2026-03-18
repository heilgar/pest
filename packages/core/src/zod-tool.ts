import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolDefinition } from './types.js';

/**
 * Convert a Zod schema to a pest ToolDefinition.
 *
 * Eliminates the need to duplicate tool definitions in JSON Schema by hand.
 * Requires zod >= 3.0.0 as a peer dependency.
 *
 * @example
 * const tools = Object.values(TOOL_DEFINITIONS).map(def =>
 *   zodTool(def.name, def.description, def.parameters)
 * );
 */
export function zodTool(
  name: string,
  description: string,
  schema: z.ZodTypeAny,
): ToolDefinition {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: zodToJsonSchema(schema) as Record<string, unknown>,
    },
  };
}
