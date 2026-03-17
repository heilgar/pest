import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chat } from './agent.js';

const PORT = Number(process.env.PORT ?? 3210);

const html = readFileSync(resolve(import.meta.dirname, 'public/index.html'), 'utf-8');

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    for await (const chunk of req) body += chunk;

    try {
      const { message } = JSON.parse(body) as { message: string };
      console.log(`\n--- User: "${message}"`);

      const response = await chat(message);

      if (response.toolCalls.length > 0) {
        for (const tc of response.toolCalls) {
          console.log(`  Tool: ${tc.name}(${JSON.stringify(tc.args)})`);
        }
      }

      const preview = response.text.length > 120
        ? `${response.text.slice(0, 120)}...`
        : response.text;
      console.log(`  Response: "${preview}"`);
      console.log(`  Tokens: ${response.usage.inputTokens} in / ${response.usage.outputTokens} out | ${response.latencyMs.toFixed(0)}ms`);

      let text = response.text;
      if (!text && response.toolCalls.length > 0) {
        text = response.toolCalls
          .map((tc) => `[Tool: ${tc.name}(${JSON.stringify(tc.args)})]`)
          .join('\n');
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        text,
        toolCalls: response.toolCalls,
      }));
    } catch (err) {
      console.error(`  Error: ${err}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Acme Store Support running at http://localhost:${PORT}`);
  console.log('');
});
