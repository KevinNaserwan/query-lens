import { ExecutionPlanNode } from './plan-normalizer';
import { AnalysisReport } from './advisor';

export function renderCliTree(rootNode: ExecutionPlanNode): string {
  const lines: string[] = [];

  function walk(node: ExecutionPlanNode, prefix: string = '', isLast: boolean = true) {
    if (!node) return;

    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    let costBadge = `[Cost: ${node.totalCost.toFixed(1)}]`;
    if (node.actualTotalTime > 0) {
      costBadge += ` [Time: ${node.actualTotalTime.toFixed(2)}ms]`;
    }
    if (node.actualRows > 0) {
      costBadge += ` [Rows: ${node.actualRows.toLocaleString()}]`;
    }

    let opColor = '\x1b[36m';
    if (node.nodeType.toLowerCase().includes('seq scan') || node.nodeType.toLowerCase().includes('table scan')) {
      opColor = '\x1b[31;1m';
    } else if (node.nodeType.toLowerCase().includes('index')) {
      opColor = '\x1b[32m';
    } else if (node.nodeType.toLowerCase().includes('join')) {
      opColor = '\x1b[33m';
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

export function generateHtmlReport(rootNode: ExecutionPlanNode, analysis: AnalysisReport): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>QueryLens: SQL Execution Plan Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
    h1, h2 { color: #38bdf8; }
    .badge-critical { background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .badge-warning { background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    pre { background: #090d16; padding: 12px; border-radius: 6px; overflow-x: auto; color: #a5f3fc; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #334155; }
  </style>
</head>
<body>
  <h1>🔍 QueryLens: SQL Execution Plan Report</h1>
  <div class="card">
    <h2>⚠️ Bottlenecks (${analysis.issues.length})</h2>
    <table>
      <thead><tr><th>Severity</th><th>Operator</th><th>Table</th><th>Diagnosis</th></tr></thead>
      <tbody>
        ${analysis.issues.map(i => `<tr><td><span class="${i.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}">${i.severity}</span></td><td><strong>${i.operator}</strong></td><td>${i.table || '-'}</td><td>${i.detail}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="card">
    <h2>💡 Recommended Index Fixes (${analysis.recommendations.length})</h2>
    ${analysis.recommendations.map(r => `<div><p><strong>${r.type}</strong> on table <code>${r.table}</code>: <em>${r.impact}</em></p><pre><code>${r.sql}</code></pre></div>`).join('')}
  </div>
</body>
</html>`;
}
