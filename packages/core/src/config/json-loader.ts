import { readFileSync } from 'node:fs';

/**
 * Interpolate ${VAR_NAME} patterns in string values with process.env.
 * - Undefined vars resolve to empty string.
 * - No recursive interpolation.
 * - Use \\${VAR} to escape a literal.
 */
function interpolateEnvVars(value: string): string {
  const escaped: string[] = [];
  const cleaned = value.replace(/\\(\$\{[^}]+\})/g, (_, token) => {
    escaped.push(token);
    return `\0ESCAPED_${escaped.length - 1}\0`;
  });
  const interpolated = cleaned.replace(/\$\{([^}]+)\}/g, (_, name) => process.env[name] ?? '');
  return interpolated.replace(/\0ESCAPED_(\d+)\0/g, (_, idx) => escaped[Number(idx)] ?? '');
}

function interpolateDeep(obj: unknown): unknown {
  if (typeof obj === 'string') return interpolateEnvVars(obj);
  if (Array.isArray(obj)) return obj.map(interpolateDeep);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateDeep(value);
    }
    return result;
  }
  return obj;
}

export function loadJsonConfig(configPath: string): unknown {
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw);
  return interpolateDeep(parsed);
}
