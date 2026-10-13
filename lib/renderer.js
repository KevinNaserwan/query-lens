'use strict';

/**
 * Renders ANSI color tree view and HTML report of an execution plan.
 */
function renderCliTree(rootNode) {
  const lines = [];

  function walk(node, prefix = '', isLast = true) {
    if (!node) return;

    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    // Cost and timing coloring
    let costBadge = `[Cost: ${node.totalCost.toFixed(1)}]`;
    if (node.actualTotalTime > 0) {
      costBadge += ` [Time: ${node.actualTotalTime.toFixed(2)}ms]`;
    }
    if (node.actualRows > 0) {
      costBadge += ` [Rows: ${node.actualRows.toLocaleString()}]`;
    }

    let opColor = '\x1b[36m'; // Cyan
    if (node.nodeType.toLowerCase().includes('seq scan') || node.nodeType.toLowerCase().includes('table scan')) {
      opColor = '\x1b[31;1m'; // Red Bold
    } else if (node.nodeType.toLowerCase().includes('index')) {
      opColor = '\x1b[32m'; // Green
    } else if (node.nodeType.toLowerCase().includes('join')) {
      opColor = '\x1b[33m'; // Yellow
    }

    let label = `${opColor}${node.nodeType}\x1b[0m`;
    if (node.relationName) {
      label += ` on \x1b[1m${node.relationName}\x1b[0m`;
    }
    if (node.indexName) {
      label += ` (\x1b[32m${node.indexName}\x1b[0m)`;
    }

    lines.push(`${prefix}${connector}${label} \x1b[90m${costBadge}\x1b[0m`);

    if (node.filter) {
      lines.push(`${childPrefix}\x1b[90mFilter: ${node.filter}\x1b[0m`);
    }

    const children = node.children || [];
    for (let i = 0; i < children.length; i++) {
      walk(children[i], childPrefix, i === children.length - 1);
    }
  }

  walk(rootNode, '', true);
  return lines.join('\n');
}

function generateHtmlReport(rootNode, analysis) {
  const jsonTree = JSON.stringify(rootNode, null, 2);
  const issuesJson = JSON.stringify(analysis.issues, null, 2);
  const recsJson = JSON.stringify(analysis.recommendations, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>QueryLens: SQL Execution Plan Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    h1, h2 { color: #38bdf8; margin-top: 0; }
    .badge-critical { background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
    .badge-warning { background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
    pre { background: #090d16; padding: 12px; border-radius: 6px; overflow-x: auto; color: #a5f3fc; border: 1px solid #1e293b; }
    .sql-code { color: #4ade80; font-family: monospace; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; }
  </style>
</head>
<body>
  <h1>🔍 QueryLens: SQL Execution Plan Report</h1>
  <p style="color: #94a3b8;">Automated performance audit and heuristic index advisor.</p>

  <div class="card">
    <h2>⚠️ Detected Performance Bottlenecks (${analysis.issues.length})</h2>
    <table>
      <thead>
        <tr><th>Severity</th><th>Operator</th><th>Table</th><th>Diagnosis</th></tr>
      </thead>
      <tbody>
        ${analysis.issues.map(i => `
          <tr>
            <td><span class="${i.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}">${i.severity}</span></td>
            <td><strong>${i.operator}</strong></td>
            <td>${i.table || '-'}</td>
            <td>${i.detail}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>💡 Recommended DDL Index Fixes (${analysis.recommendations.length})</h2>
    ${analysis.recommendations.map(r => `
      <div style="margin-bottom: 16px; border-left: 3px solid #38bdf8; padding-left: 12px;">
        <p style="margin: 4px 0;"><strong>${r.type}</strong> on table <code>${r.table}</code>: <em>${r.impact}</em></p>
        <pre class="sql-code">${r.sql}</pre>
      </div>
    `).join('')}
  </div>

  <div class="card">
    <h2>🌳 Execution Plan Tree (Normalized)</h2>
    <pre>${JSON.stringify(rootNode, null, 2)}</pre>
  </div>
</body>
</html>`;
}

module.exports = {
  renderCliTree,
  generateHtmlReport
};
