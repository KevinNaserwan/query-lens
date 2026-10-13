'use strict';

class Advisor {
  constructor() {
    this.issues = [];
    this.recommendations = [];
  }

  analyze(rootNode) {
    this.issues = [];
    this.recommendations = [];
    this._traverse(rootNode, 0);

    return {
      issues: this.issues,
      recommendations: this.recommendations,
      summary: {
        totalIssues: this.issues.length,
        criticalCount: this.issues.filter(i => i.severity === 'CRITICAL').length,
        warningCount: this.issues.filter(i => i.severity === 'WARNING').length
      }
    };
  }

  _traverse(node, depth) {
    if (!node) return;

    // Check 1: Sequential Scan / Full Table Scan on Large Table
    if (
      node.nodeType.toLowerCase().includes('seq scan') ||
      node.nodeType.toLowerCase().includes('table scan') ||
      node.nodeType.toLowerCase().includes('full table scan')
    ) {
      const rowsScanned = node.actualRows || node.plannedRows || 0;
      const rowsRemoved = node.rowsRemovedByFilter || 0;

      if (rowsScanned > 1000 || rowsRemoved > 500) {
        const issue = {
          severity: 'CRITICAL',
          operator: node.nodeType,
          table: node.relationName,
          detail: `Full table scan on "${node.relationName}" examined ${rowsScanned.toLocaleString()} rows (discarded ${rowsRemoved.toLocaleString()} via filter).`
        };
        this.issues.push(issue);

        // Deduce column from filter
        if (node.filter) {
          const colMatch = node.filter.match(/([a-zA-Z0-9_]+)\s*(?:=|>=|<=|>|<|LIKE|IN)/i);
          const colName = colMatch ? colMatch[1] : 'unidentified_column';
          const indexName = `idx_${node.relationName}_${colName}`;
          this.recommendations.push({
            type: 'ADD_INDEX',
            table: node.relationName,
            columns: [colName],
            sql: `CREATE INDEX CONCURRENTLY ${indexName} ON ${node.relationName} (${colName});`,
            impact: 'High: Eliminates full table scan and converts operator to Bitmap Index / Index Scan.'
          });
        }
      }
    }

    // Check 2: Row Estimate Discrepancy (Stale Statistics)
    if (node.plannedRows > 0 && node.actualRows > 0) {
      const ratio = Math.max(node.plannedRows / node.actualRows, node.actualRows / node.plannedRows);
      if (ratio > 10 && (node.actualRows > 500 || node.plannedRows > 500)) {
        this.issues.push({
          severity: 'WARNING',
          operator: node.nodeType,
          table: node.relationName,
          detail: `Planner row estimation error: Expected ${node.plannedRows.toLocaleString()} rows, but received ${node.actualRows.toLocaleString()} (discrepancy factor ${ratio.toFixed(1)}x).`
        });

        if (node.relationName) {
          this.recommendations.push({
            type: 'ANALYZE_STATISTICS',
            table: node.relationName,
            sql: `ANALYZE ${node.relationName};`,
            impact: 'Medium: Updates planner distribution statistics, preventing suboptimal join order selection.'
          });
        }
      }
    }

    // Check 3: Nested Loop with high inner loop executions
    if (node.nodeType.toLowerCase().includes('nested loop') && node.actualRows > 5000) {
      this.issues.push({
        severity: 'WARNING',
        operator: node.nodeType,
        table: null,
        detail: `Nested Loop join produced ${node.actualRows.toLocaleString()} rows; consider ensuring inner table has index or examine Hash Join threshold.`
      });
    }

    // Traverse children
    for (const child of node.children) {
      this._traverse(child, depth + 1);
    }
  }
}

module.exports = { Advisor };
