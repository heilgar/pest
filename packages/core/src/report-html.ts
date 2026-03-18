import type { SendEntry } from './accumulator.js';
import { escapeHtml, formatDuration, formatTokens } from './format.js';

interface ReportMatcher {
  matcher: string;
  pass: boolean;
  score?: number;
  reasoning?: string;
  judgeModel?: string;
}

interface ReportTest {
  test: string;
  status: string;
  sends: SendEntry[];
  matchers: ReportMatcher[];
}

interface ReportSummary {
  tests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: string;
  judgeCount: number;
  toolCallCount: number;
}

interface ReportData {
  timestamp: string;
  summary: ReportSummary;
  tests: ReportTest[];
}

export function buildHtmlReport(data: ReportData): string {
  const s = data.summary;

  const testRows = data.tests
    .map((t) => {
      const statusIcon = t.status === 'passed' ? '&#10003;' : '&#10007;';
      const statusClass = t.status === 'passed' ? 'pass' : 'fail';

      const inputTokens = t.sends.reduce(
        (sum, s) => sum + s.usage.inputTokens,
        0,
      );
      const outputTokens = t.sends.reduce(
        (sum, s) => sum + s.usage.outputTokens,
        0,
      );
      const latencyMs = t.sends.reduce((sum, s) => sum + s.latencyMs, 0);
      const toolCalls = t.sends.flatMap((s) => s.toolCalls);

      const sendsHtml = t.sends
        .map(
          (send, i) => `
      <div class="send">
        <div class="send-header">
          <span class="label">Send #${i + 1}</span>
          <span class="meta">${escapeHtml(send.provider)} / ${escapeHtml(send.model)} &middot; ${formatDuration(send.latencyMs)} &middot; ${send.usage.inputTokens}→${send.usage.outputTokens} tok</span>
        </div>
        ${send.systemPrompt ? `<div class="message system"><span class="role">System</span><pre>${escapeHtml(send.systemPrompt)}</pre></div>` : ''}
        <div class="message user"><span class="role">User</span><pre>${escapeHtml(send.input)}</pre></div>
        <div class="message assistant"><span class="role">Assistant</span><pre>${escapeHtml(send.output || '(no text — tool calls only)')}</pre></div>
        ${
          send.toolCalls.length > 0
            ? `
          <div class="tool-calls">
            ${send.toolCalls.map((tc) => `<div class="tool-call"><span class="tool-name">${escapeHtml(tc.name)}</span><code>${escapeHtml(JSON.stringify(tc.args))}</code></div>`).join('')}
          </div>
        `
            : ''
        }
      </div>
    `,
        )
        .join('');

      const matchersHtml = t.matchers
        .map((m) => {
          const mIcon = m.pass ? '&#10003;' : '&#10007;';
          const mClass = m.pass ? 'pass' : 'fail';
          const scoreStr =
            m.score != null
              ? `<span class="score">score ${m.score}</span>`
              : '';
          const judgeStr = m.judgeModel
            ? `<span class="judge">judge: ${escapeHtml(m.judgeModel)}</span>`
            : '';
          const reasonStr = m.reasoning
            ? `<div class="reasoning">${escapeHtml(m.reasoning)}</div>`
            : '';
          return `<div class="matcher ${mClass}"><span class="matcher-icon">${mIcon}</span> <code>${escapeHtml(m.matcher)}</code> ${scoreStr} ${judgeStr}${reasonStr}</div>`;
        })
        .join('');

      return `
      <div class="test ${statusClass}">
        <div class="test-header" onclick="this.parentElement.classList.toggle('open')">
          <span class="status-icon">${statusIcon}</span>
          <span class="test-name">${escapeHtml(t.test)}</span>
          <span class="test-meta">${formatDuration(latencyMs)} &middot; ${formatTokens(inputTokens)}→${formatTokens(outputTokens)} tok${toolCalls.length > 0 ? ` &middot; ${toolCalls.length} tool calls` : ''}</span>
        </div>
        <div class="test-body">
          <div class="sends">${sendsHtml}</div>
          ${matchersHtml ? `<div class="matchers"><h4>Assertions</h4>${matchersHtml}</div>` : ''}
        </div>
      </div>
    `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>pest report — ${escapeHtml(data.timestamp)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0d1117; color: #c9d1d9; line-height: 1.5; }
  .container { max-width: 1000px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; color: #f0f6fc; }
  h1 span { color: #58a6ff; }
  .timestamp { color: #8b949e; font-size: 14px; margin-bottom: 24px; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 32px; }
  .stat { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
  .stat-value { font-size: 24px; font-weight: 600; color: #f0f6fc; }
  .stat-label { font-size: 12px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; }
  .test { background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
  .test-header { padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; user-select: none; }
  .test-header:hover { background: #1c2128; }
  .status-icon { font-size: 16px; }
  .pass .status-icon { color: #3fb950; }
  .fail .status-icon { color: #f85149; }
  .test-name { flex: 1; font-size: 14px; }
  .test-meta { font-size: 12px; color: #8b949e; }
  .test-body { display: none; border-top: 1px solid #30363d; padding: 16px; }
  .test.open .test-body { display: block; }
  .send { margin-bottom: 16px; }
  .send-header { font-size: 12px; color: #8b949e; margin-bottom: 8px; display: flex; justify-content: space-between; }
  .label { font-weight: 600; color: #c9d1d9; }
  .message { margin-bottom: 8px; border-radius: 6px; padding: 10px 14px; font-size: 13px; }
  .message .role { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
  .message pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; }
  .message.system { background: #1c1c3a; border-left: 3px solid #8b5cf6; }
  .message.system .role { color: #8b5cf6; }
  .message.user { background: #0c2d48; border-left: 3px solid #58a6ff; }
  .message.user .role { color: #58a6ff; }
  .message.assistant { background: #1a2b1a; border-left: 3px solid #3fb950; }
  .message.assistant .role { color: #3fb950; }
  .tool-calls { margin-top: 8px; }
  .tool-call { font-size: 13px; padding: 6px 10px; background: #1c1f26; border-radius: 4px; margin-bottom: 4px; display: flex; gap: 8px; align-items: center; }
  .tool-name { color: #d2a8ff; font-weight: 600; }
  .tool-call code { color: #8b949e; font-size: 12px; }
  .matchers { margin-top: 16px; }
  .matchers h4 { font-size: 12px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .matcher { font-size: 13px; padding: 6px 10px; margin-bottom: 4px; border-radius: 4px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .matcher.pass { background: #1a2b1a; }
  .matcher.fail { background: #2b1a1a; }
  .matcher-icon { font-size: 14px; }
  .matcher.pass .matcher-icon { color: #3fb950; }
  .matcher.fail .matcher-icon { color: #f85149; }
  .matcher code { color: #d2a8ff; }
  .score { color: #e3b341; font-size: 12px; }
  .judge { color: #8b949e; font-size: 12px; }
  .reasoning { width: 100%; color: #8b949e; font-size: 12px; font-style: italic; margin-top: 4px; }
</style>
</head>
<body>
<div class="container">
  <h1><span>pest</span> report</h1>
  <div class="timestamp">${escapeHtml(data.timestamp)}</div>
  <div class="summary">
    <div class="stat"><div class="stat-value">${s.tests}</div><div class="stat-label">Tests</div></div>
    <div class="stat"><div class="stat-value">${formatTokens(s.totalTokens)}</div><div class="stat-label">Tokens</div></div>
    <div class="stat"><div class="stat-value">${escapeHtml(s.estimatedCost)}</div><div class="stat-label">Est. Cost</div></div>
    <div class="stat"><div class="stat-value">${s.judgeCount}</div><div class="stat-label">Judge Calls</div></div>
    <div class="stat"><div class="stat-value">${s.toolCallCount}</div><div class="stat-label">Tool Calls</div></div>
    <div class="stat"><div class="stat-value">${formatTokens(s.inputTokens)}→${formatTokens(s.outputTokens)}</div><div class="stat-label">In → Out</div></div>
  </div>
  ${testRows}
</div>
</body>
</html>`;
}
