import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  escapeHtml,
  formatCost,
  formatDuration,
  formatTokens,
} from '../format.js';
import type { EvalOutput, ProviderCaseResult } from './types.js';

function renderProviderTab(
  _providerName: string,
  result: ProviderCaseResult,
): string {
  if (result.error) {
    return `<div class="tab-content"><div class="error-msg">Error: ${escapeHtml(result.error)}</div></div>`;
  }

  const r = result.response;

  const toolCallsHtml =
    r.toolCalls.length > 0
      ? `<div class="tool-calls"><h5>Tool Calls</h5>${r.toolCalls
          .map(
            (tc) =>
              `<div class="tool-call"><span class="tool-name">${escapeHtml(tc.name)}</span><code>${escapeHtml(JSON.stringify(tc.args))}</code></div>`,
          )
          .join('')}</div>`
      : '';

  const matchersHtml =
    result.matchers.length > 0
      ? `<div class="eval-matchers"><h5>Matchers</h5>${result.matchers
          .map((m) => {
            const icon = m.pass ? '&#10003;' : '&#10007;';
            const cls = m.pass ? 'pass' : 'fail';
            return `<div class="matcher ${cls}"><span class="matcher-icon">${icon}</span> <code>${escapeHtml(m.type)}</code></div>`;
          })
          .join('')}</div>`
      : '';

  const rubricsHtml =
    result.rubrics.length > 0
      ? `<div class="eval-rubrics"><h5>Rubrics</h5>${result.rubrics
          .map(
            (rb) =>
              `<div class="rubric"><span class="rubric-score">${rb.score.toFixed(2)}</span> <span class="rubric-text">${escapeHtml(rb.rubric)}</span><div class="rubric-reasoning">${escapeHtml(rb.reasoning)}</div></div>`,
          )
          .join('')}</div>`
      : '';

  const metaHtml = `<div class="provider-meta">${formatDuration(r.latencyMs)} &middot; ${formatTokens(r.usage.inputTokens)}&rarr;${formatTokens(r.usage.outputTokens)} tok &middot; ${formatCost(result.costCents)}</div>`;

  return `<div class="tab-content">
    <div class="response-text"><pre>${escapeHtml(r.text || '(no text — tool calls only)')}</pre></div>
    ${toolCallsHtml}
    ${matchersHtml}
    ${rubricsHtml}
    ${metaHtml}
  </div>`;
}

function renderCase(
  caseName: string,
  providers: Record<string, ProviderCaseResult>,
  caseIndex: number,
): string {
  const providerNames = Object.keys(providers);
  if (providerNames.length === 0) return '';

  const tabButtons = providerNames
    .map(
      (name, i) =>
        `<button class="tab-btn${i === 0 ? ' active' : ''}" onclick="switchTab(this, 'case-${caseIndex}', '${escapeHtml(name)}')">${escapeHtml(name)}</button>`,
    )
    .join('');

  const tabPanels = providerNames
    .map(
      (name, i) =>
        `<div class="tab-panel${i === 0 ? ' active' : ''}" data-case="case-${caseIndex}" data-provider="${escapeHtml(name)}">${renderProviderTab(name, providers[name]!)}</div>`,
    )
    .join('');

  return `
    <div class="eval-case">
      <h3>${escapeHtml(caseName)}</h3>
      <div class="tab-bar">${tabButtons}</div>
      <div class="tab-panels">${tabPanels}</div>
    </div>`;
}

function renderSummaryTable(output: EvalOutput): string {
  const headerCells = ['Provider', 'Score', 'Pass Rate', 'Avg Latency', 'Total Cost', 'Total Tokens']
    .map((h) => `<th>${h}</th>`)
    .join('');

  const rows = Object.entries(output.summary)
    .map(
      ([name, s]) =>
        `<tr><td>${escapeHtml(name)}</td><td>${s.score.toFixed(2)}</td><td>${s.passRate}</td><td>${formatDuration(s.avgLatencyMs)}</td><td>${formatCost(s.totalCostCents)}</td><td>${formatTokens(s.totalTokens)}</td></tr>`,
    )
    .join('');

  return `<table class="summary-table"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function buildEvalHtmlReport(output: EvalOutput): string {
  const casesHtml = output.results
    .map((r, i) => renderCase(r.case, r.providers, i))
    .join('');

  const summaryHtml = renderSummaryTable(output);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>pest eval report - ${escapeHtml(output.timestamp)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0d1117; color: #c9d1d9; line-height: 1.5; }
  .container { max-width: 1100px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; color: #f0f6fc; }
  h1 span { color: #58a6ff; }
  .timestamp { color: #8b949e; font-size: 14px; margin-bottom: 24px; }
  h3 { font-size: 16px; margin-bottom: 12px; color: #f0f6fc; }
  h5 { font-size: 12px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; margin-top: 12px; }
  .eval-case { background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin-bottom: 16px; padding: 16px; }
  .tab-bar { display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
  .tab-btn { background: none; border: 1px solid transparent; border-radius: 6px 6px 0 0; color: #8b949e; cursor: pointer; font-size: 13px; padding: 6px 14px; font-family: inherit; }
  .tab-btn:hover { color: #c9d1d9; background: #1c2128; }
  .tab-btn.active { color: #58a6ff; border-color: #30363d; border-bottom-color: #0d1117; background: #0d1117; }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }
  .response-text { margin-bottom: 12px; }
  .response-text pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 14px; line-height: 1.6; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 12px; }
  .tool-calls { margin-bottom: 8px; }
  .tool-call { font-size: 13px; padding: 6px 10px; background: #1c1f26; border-radius: 4px; margin-bottom: 4px; display: flex; gap: 8px; align-items: center; }
  .tool-name { color: #d2a8ff; font-weight: 600; }
  .tool-call code { color: #8b949e; font-size: 12px; }
  .matcher { font-size: 13px; padding: 4px 8px; margin-bottom: 3px; border-radius: 4px; display: flex; align-items: center; gap: 6px; }
  .matcher.pass { background: #1a2b1a; }
  .matcher.fail { background: #2b1a1a; }
  .matcher.pass .matcher-icon { color: #3fb950; }
  .matcher.fail .matcher-icon { color: #f85149; }
  .matcher code { color: #d2a8ff; }
  .rubric { font-size: 13px; padding: 6px 8px; margin-bottom: 4px; background: #1c1f26; border-radius: 4px; }
  .rubric-score { color: #e3b341; font-weight: 600; margin-right: 6px; }
  .rubric-text { color: #c9d1d9; }
  .rubric-reasoning { color: #8b949e; font-size: 12px; font-style: italic; margin-top: 2px; }
  .provider-meta { font-size: 12px; color: #8b949e; margin-top: 12px; padding-top: 8px; border-top: 1px solid #30363d; }
  .error-msg { color: #f85149; font-size: 14px; padding: 12px; background: #2b1a1a; border-radius: 6px; }
  .summary-section { margin-top: 32px; }
  .summary-section h2 { font-size: 18px; margin-bottom: 12px; color: #f0f6fc; }
  .summary-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .summary-table th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #30363d; color: #8b949e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; }
  .summary-table th:hover { color: #c9d1d9; }
  .summary-table td { padding: 10px 12px; border-bottom: 1px solid #21262d; }
  .summary-table tr:hover td { background: #1c2128; }
</style>
</head>
<body>
<div class="container">
  <h1><span>pest</span> eval report</h1>
  <div class="timestamp">${escapeHtml(output.timestamp)} &middot; ${output.results.length} cases &middot; ${output.config.providers.length} providers</div>
  ${casesHtml}
  <div class="summary-section">
    <h2>Summary</h2>
    ${summaryHtml}
  </div>
</div>
<script>
function switchTab(btn, caseId, provider) {
  var parent = btn.closest('.eval-case');
  parent.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  parent.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  btn.classList.add('active');
  parent.querySelector('.tab-panel[data-case="' + caseId + '"][data-provider="' + provider + '"]').classList.add('active');
}

document.querySelectorAll('.summary-table th').forEach(function(th, colIdx) {
  th.addEventListener('click', function() {
    var table = th.closest('table');
    var tbody = table.querySelector('tbody');
    var rows = Array.from(tbody.querySelectorAll('tr'));
    var dir = th.dataset.sort === 'asc' ? 'desc' : 'asc';
    th.dataset.sort = dir;
    rows.sort(function(a, b) {
      var aVal = a.children[colIdx].textContent;
      var bVal = b.children[colIdx].textContent;
      var aNum = parseFloat(aVal);
      var bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) return dir === 'asc' ? aNum - bNum : bNum - aNum;
      return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    rows.forEach(function(r) { tbody.appendChild(r); });
  });
});
</script>
</body>
</html>`;
}

export function writeEvalHtml(output: EvalOutput, filePath: string): void {
  const absPath = resolve(process.cwd(), filePath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, buildEvalHtmlReport(output));
}
