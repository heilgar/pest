import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as v from 'valibot';
import { loadJsonConfig } from './json-loader.js';
import { type PestConfig, PestConfigSchema } from './schema.js';

const CONFIG_FILES = ['pest.config.ts', 'pest.config.js', 'pest.config.mjs', 'pest.config.json'];

export interface LoadConfigOptions {
  /** Explicit path to a config file. Overrides automatic discovery. */
  configFile?: string;
}

// .env files in priority order (lowest first — higher priority files overwrite)
const ENV_FILES = ['.env', '.env.local'];

let envLoaded = false;

/** Reset env-loaded flag so loadEnv() can be called again. For testing only. */
export function resetEnv(): void {
  envLoaded = false;
}

function parseEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Never overwrite real environment variables
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function findProjectRoot(cwd: string): string {
  let dir = resolve(cwd);
  while (true) {
    // Look for pest.config.ts or package.json as project root markers
    for (const marker of [...CONFIG_FILES, 'package.json']) {
      if (existsSync(resolve(dir, marker))) return dir;
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(cwd);
}

/**
 * Load environment variables from .env files into process.env.
 *
 * Files loaded (lowest to highest priority):
 * - `.env` — shared defaults, may be committed
 * - `.env.local` — local overrides, should be gitignored
 *
 * Real environment variables are never overwritten.
 * Files are loaded from the project root (where pest.config.ts or package.json is).
 *
 * This is called automatically by `loadConfig()` and `createProvider()`.
 * Safe to call multiple times — only loads once.
 */
export function loadEnv(cwd: string = process.cwd()): void {
  if (envLoaded) return;
  envLoaded = true;

  const root = findProjectRoot(cwd);

  // Load in order: .env first, then .env.local overwrites
  // But since we never overwrite existing keys, we load in reverse priority:
  // .env.local first (gets set), then .env (skips keys already set by .env.local)
  for (const file of [...ENV_FILES].reverse()) {
    parseEnvFile(resolve(root, file));
  }
}

export async function loadConfig(
  cwd: string = process.cwd(),
  options?: LoadConfigOptions,
): Promise<PestConfig> {
  loadEnv(cwd);

  let configPath: string | undefined;

  if (options?.configFile) {
    const resolved = resolve(cwd, options.configFile);
    if (!existsSync(resolved)) {
      throw new Error(`Config file not found: ${resolved}`);
    }
    configPath = resolved;
  } else {
    for (const file of CONFIG_FILES) {
      const candidate = resolve(cwd, file);
      if (existsSync(candidate)) {
        configPath = candidate;
        break;
      }
    }
  }

  if (!configPath) {
    throw new Error(
      `No pest config found. Create one of: ${CONFIG_FILES.join(', ')}`,
    );
  }

  let raw: unknown;

  if (configPath.endsWith('.json')) {
    raw = loadJsonConfig(configPath);
  } else {
    const configUrl = pathToFileURL(configPath).href;
    let mod: Record<string, unknown>;
    try {
      mod = await import(configUrl);
    } catch (err) {
      if (
        configPath.endsWith('.ts') &&
        (err as NodeJS.ErrnoException).code === 'ERR_UNKNOWN_FILE_EXTENSION'
      ) {
        throw new Error(
          `Cannot import TypeScript config "${configPath}".\n` +
            'Run with tsx (npx tsx ...) or use pest.config.js / pest.config.mjs instead.',
        );
      }
      throw err;
    }
    raw = mod.default ?? mod;
  }

  const result = v.safeParse(PestConfigSchema, raw);

  if (!result.success) {
    const issues = v.flatten(result.issues);
    const messages = Object.entries(issues.nested ?? {})
      .map(([path, errors]) => `  ${path}: ${(errors ?? []).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid pest config:\n${messages}`);
  }

  return result.output;
}

export function defineConfig(config: PestConfig): PestConfig {
  return config;
}
