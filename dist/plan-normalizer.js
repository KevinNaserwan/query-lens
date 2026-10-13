"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePlan = normalizePlan;
function normalizePlan(rawInput) {
    let jsonPlan = null;
    if (typeof rawInput === 'string') {
        try {
            jsonPlan = JSON.parse(rawInput);
        }
        catch {
            return parseTextPlan(rawInput);
        }
    }
    else {
        jsonPlan = rawInput;
    }
    if (Array.isArray(jsonPlan) && jsonPlan[0] && jsonPlan[0].Plan) {
        return normalizePostgresNode(jsonPlan[0].Plan);
    }
    if (jsonPlan && jsonPlan.Plan) {
        return normalizePostgresNode(jsonPlan.Plan);
    }
    if (jsonPlan && jsonPlan.query_block) {
        return normalizeMysqlNode(jsonPlan.query_block);
    }
    return normalizePostgresNode(jsonPlan);
}
function normalizePostgresNode(node) {
    if (!node)
        return null;
    const nodeType = node['Node Type'] || 'Unknown Operator';
    const totalCost = Number(node['Total Cost']) || 0;
    const startupCost = Number(node['Startup Cost']) || 0;
    const actualTotalTime = Number(node['Actual Total Time']) || 0;
    const actualRows = Number(node['Actual Rows']) || 0;
    const plannedRows = Number(node['Plan Rows']) || 0;
    const relationName = node['Relation Name'] || null;
    const alias = node['Alias'] || null;
    const indexName = node['Index Name'] || null;
    const filter = node['Filter'] || null;
    const rowsRemovedByFilter = Number(node['Rows Removed by Filter']) || 0;
    const hashCond = node['Hash Cond'] || null;
    const joinType = node['Join Type'] || null;
    const children = (node.Plans || [])
        .map(normalizePostgresNode)
        .filter((n) => n !== null);
    return {
        nodeType,
        relationName,
        alias,
        indexName,
        filter,
        rowsRemovedByFilter,
        hashCond,
        joinType,
        totalCost,
        startupCost,
        actualTotalTime,
        actualRows,
        plannedRows,
        children
    };
}
function normalizeMysqlNode(block) {
    let relationName = null;
    let actualRows = 0;
    let totalCost = 0;
    let nodeType = 'TABLE SCAN';
    if (block.table) {
        relationName = block.table.table_name || 'unknown';
        actualRows = block.table.rows_examined_per_scan || 0;
        totalCost = parseFloat(block.table.cost_info ? block.table.cost_info.eval_cost || 0 : 0);
        if (block.table.access_type === 'ALL') {
            nodeType = 'Full Table Scan (ALL)';
        }
        else if (block.table.key) {
            nodeType = `Index Scan (${block.table.key})`;
        }
    }
    return {
        nodeType,
        relationName,
        alias: relationName,
        indexName: block.table ? block.table.key : null,
        filter: block.table ? block.table.attached_condition : null,
        rowsRemovedByFilter: 0,
        hashCond: null,
        joinType: null,
        totalCost,
        startupCost: 0,
        actualTotalTime: 0,
        actualRows,
        plannedRows: actualRows,
        children: []
    };
}
function parseTextPlan(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    return {
        nodeType: lines[0] ? lines[0].trim() : 'Root',
        relationName: null,
        alias: null,
        indexName: null,
        filter: null,
        rowsRemovedByFilter: 0,
        hashCond: null,
        joinType: null,
        actualRows: 0,
        plannedRows: 0,
        startupCost: 0,
        actualTotalTime: 0,
        totalCost: 100,
        children: []
    };
}
