import { defineCommand } from 'citty';

interface ExecRequest {
  version?: string;
  method: 'send' | 'sendWithMcp' | 'match';
  params: Record<string, unknown>;
}

interface ExecResponse {
  success: boolean;
  result?: unknown;
  error?: { code: string; message: string };
}

function respond(data: ExecResponse): void {
  process.stdout.write(JSON.stringify(data) + '\n');
}

function respondError(code: string, message: string): void {
  respond({ success: false, error: { code, message } });
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function handleSend(params: Record<string, unknown>, configPath?: string): Promise<void> {
  const { loadConfig, createProvider, send } = await import('@heilgar/pest-core');

  const config = await loadConfig(process.cwd(), configPath ? { configFile: configPath } : undefined);
  const providerName = params.provider as string;
  const providerConfig = config.providers.find((p) => p.name === providerName);

  if (!providerConfig) {
    respondError(
      'PROVIDER_NOT_FOUND',
      `Provider "${providerName}" not found in config. Available: ${config.providers.map((p) => p.name).join(', ')}`,
    );
    return;
  }

  const provider = createProvider(providerConfig);

  const result = await send(provider, params.message as string, {
    systemPrompt: params.systemPrompt as string | undefined,
    tools: params.tools as import('@heilgar/pest-core').ToolDefinition[] | undefined,
    temperature: params.temperature as number | undefined,
    maxTokens: params.maxTokens as number | undefined,
    responseFormat: params.responseFormat as 'text' | 'json' | undefined,
  });

  respond({
    success: true,
    result: {
      text: result.text,
      toolCalls: result.toolCalls,
      usage: result.usage,
      latencyMs: result.latencyMs,
      provider: result.provider,
      model: result.model,
    },
  });
}

async function handleSendWithMcp(params: Record<string, unknown>, configPath?: string): Promise<void> {
  const { loadConfig, createProvider } = await import('@heilgar/pest-core');
  const { useMcpServer, sendWithMcp, closeAllMcpServers } = await import('@heilgar/pest-mcp');

  const config = await loadConfig(process.cwd(), configPath ? { configFile: configPath } : undefined);
  const providerName = params.provider as string;
  const providerConfig = config.providers.find((p) => p.name === providerName);

  if (!providerConfig) {
    respondError('PROVIDER_NOT_FOUND', `Provider "${providerName}" not found in config.`);
    return;
  }

  const provider = createProvider(providerConfig);
  const mcpServer = await useMcpServer(params.mcpServer as string);

  try {
    const result = await sendWithMcp(provider, params.message as string, {
      mcpServer,
      systemPrompt: params.systemPrompt as string | undefined,
      maxSteps: params.maxSteps as number | undefined,
      additionalTools: params.additionalTools as import('@heilgar/pest-core').ToolDefinition[] | undefined,
    });

    respond({
      success: true,
      result: {
        text: result.text,
        toolCalls: result.toolCalls,
        usage: result.usage,
        latencyMs: result.latencyMs,
        provider: result.provider,
        model: result.model,
      },
    });
  } finally {
    await closeAllMcpServers();
  }
}

async function handleMatch(params: Record<string, unknown>, configPath?: string): Promise<void> {
  const {
    loadConfig,
    createProvider,
    satisfiesCriteria,
    matchesSemanticMeaning,
    classifiedAs,
    doesNotDisclose,
  } = await import('@heilgar/pest-core');

  const matcher = params.matcher as string;
  const response = params.response as import('@heilgar/pest-core').PestResponse;
  const args = params.args as Record<string, unknown>;

  const config = await loadConfig(process.cwd(), configPath ? { configFile: configPath } : undefined);
  let judge: import('@heilgar/pest-core').Provider | undefined;
  const judgeName = (params.judge as string | undefined) ?? config.judge?.provider;

  if (judgeName) {
    const judgeConfig = config.providers.find((p) => p.name === judgeName);
    if (!judgeConfig) {
      respondError(
        'PROVIDER_NOT_FOUND',
        `Judge provider "${judgeName}" not found in config. Available: ${config.providers.map((p) => p.name).join(', ')}`,
      );
      return;
    }
    judge = createProvider(judgeConfig);
  }

  let result: import('@heilgar/pest-core').MatcherResult;

  switch (matcher) {
    case 'satisfiesCriteria': {
      if (!judge) {
        respondError('NO_JUDGE', 'satisfiesCriteria requires a judge provider.');
        return;
      }
      const rubric = args.passThreshold !== undefined
        ? { criteria: args.rubric as string, passThreshold: args.passThreshold as number }
        : (args.rubric as string);
      result = await satisfiesCriteria(response, rubric, judge);
      break;
    }
    case 'matchesSemanticMeaning': {
      if (!judge) {
        respondError('NO_JUDGE', 'matchesSemanticMeaning requires a judge provider.');
        return;
      }
      result = await matchesSemanticMeaning(response, args.expected as string, judge, {
        threshold: args.threshold as number | undefined,
      });
      break;
    }
    case 'classifiedAs': {
      if (!judge) {
        respondError('NO_JUDGE', 'classifiedAs requires a judge provider.');
        return;
      }
      result = await classifiedAs(response, args.label as string, judge, {
        categories: args.categories as string[] | undefined,
      });
      break;
    }
    case 'doesNotDisclose': {
      if (!judge) {
        respondError('NO_JUDGE', 'doesNotDisclose requires a judge provider.');
        return;
      }
      result = await doesNotDisclose(response, args.topic as string, judge);
      break;
    }
    case 'matchesResponseSchema': {
      const Ajv = (await import('ajv')).default;
      const ajv = new Ajv();
      const schema = args.schema as Record<string, unknown>;
      let parsed: unknown;
      try {
        parsed = JSON.parse(response.text);
      } catch {
        result = {
          pass: false,
          message: `Expected response to be valid JSON, but failed to parse: ${response.text.slice(0, 100)}`,
        };
        break;
      }
      const validate = ajv.compile(schema);
      const valid = validate(parsed);
      result = {
        pass: !!valid,
        message: valid
          ? 'Expected response NOT to match schema, but it does.'
          : `Schema validation failed: ${ajv.errorsText(validate.errors)}`,
        metadata: valid ? { parsed } : { parsed, errors: validate.errors },
      };
      break;
    }
    default:
      respondError('UNKNOWN_MATCHER', `Unknown matcher: ${matcher}`);
      return;
  }

  respond({ success: true, result });
}

export const execCommand = defineCommand({
  meta: { description: 'Execute pest operations via JSON protocol (stdin/stdout)' },
  args: {
    config: {
      type: 'string',
      alias: 'c',
      description: 'Path to pest config file',
    },
  },
  async run({ args }) {
    // Suppress all console output during exec mode
    const origLog = console.log;
    const origWarn = console.warn;
    const origInfo = console.info;
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};

    try {
      const input = await readStdin();
      if (!input.trim()) {
        respondError('EMPTY_INPUT', 'No JSON input received on stdin.');
        process.exit(1);
      }

      let request: ExecRequest;
      try {
        request = JSON.parse(input) as ExecRequest;
      } catch {
        respondError('INVALID_JSON', 'Failed to parse JSON input.');
        process.exit(1);
      }

      const configPath = args.config ?? undefined;

      switch (request.method) {
        case 'send':
          await handleSend(request.params, configPath);
          break;
        case 'sendWithMcp':
          await handleSendWithMcp(request.params, configPath);
          break;
        case 'match':
          await handleMatch(request.params, configPath);
          break;
        default:
          respondError('UNKNOWN_METHOD', `Unknown method: ${(request as ExecRequest).method}`);
          process.exit(1);
      }
    } catch (err) {
      respondError('INTERNAL_ERROR', err instanceof Error ? err.message : String(err));
      process.exit(1);
    } finally {
      console.log = origLog;
      console.warn = origWarn;
      console.info = origInfo;
    }
  },
});
