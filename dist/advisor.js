"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Advisor = void 0;
class Advisor {
    issues = [];
    recommendations = [];
    analyze(rootNode) {
        this.issues = [];
        this.recommendations = [];
        this.traverse(rootNode);
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
    traverse(node) {
        if (!node)
            return;
        const opLower = node.nodeType.toLowerCase();
        if (opLower.includes('seq scan') || opLower.includes('table scan') || opLower.includes('full table scan')) {
            const rowsScanned = node.actualRows || node.plannedRows || 0;
            const rowsRemoved = node.rowsRemovedByFilter || 0;
            if (rowsScanned > 1000 || rowsRemoved > 500) {
                this.issues.push({
                    severity: 'CRITICAL',
                    operator: node.nodeType,
                    table: node.relationName,
                    detail: `Full table scan on "${node.relationName || 'table'}" examined ${rowsScanned.toLocaleString()} rows (discarded ${rowsRemoved.toLocaleString()} via filter).`
                });
                if (node.filter && node.relationName) {
                    const colMatch = node.filter.match(/([a-zA-Z0-9_]+)\s*(?:=|>=|<=|>|<|LIKE|IN)/i);
                    const colName = colMatch ? colMatch[1] : 'column_name';
                    const indexName = `idx_${node.relationName}_${colName}`;
                    this.recommendations.push({
                        type: 'ADD_INDEX',
                        table: node.relationName,
                        columns: [colName],
                        sql: `CREATE INDEX CONCURRENTLY ${indexName} ON ${node.relationName} (${colName});`,
                        impact: 'High: Converts expensive Sequential Table Scan into fast Index / Bitmap Scan.'
                    });
                }
            }
        }
        if (node.plannedRows > 0 && node.actualRows > 0) {
            const ratio = Math.max(node.plannedRows / node.actualRows, node.actualRows / node.plannedRows);
            if (ratio > 10 && (node.actualRows > 500 || node.plannedRows > 500)) {
                this.issues.push({
                    severity: 'WARNING',
                    operator: node.nodeType,
                    table: node.relationName,
                    detail: `Planner estimation drift: Expected ${node.plannedRows.toLocaleString()} rows, actually scanned ${node.actualRows.toLocaleString()} (${ratio.toFixed(1)}x drift).`
                });
                if (node.relationName) {
                    this.recommendations.push({
                        type: 'ANALYZE_STATISTICS',
                        table: node.relationName,
                        columns: [],
                        sql: `ANALYZE ${node.relationName};`,
                        impact: 'Medium: Updates statistical distribution histograms to avoid suboptimal joins.'
                    });
                }
            }
        }
        for (const child of node.children) {
            this.traverse(child);
        }
    }
}
exports.Advisor = Advisor;
