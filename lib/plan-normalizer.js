'use strict';

/**
 * Parses execution plans from PostgreSQL JSON, MySQL EXPLAIN JSON, or text.
 */
function normalizePlan(rawInput) {
  let jsonPlan = null;
  if (typeof rawInput === 'string') {
    try {
      jsonPlan = JSON.parse(rawInput);
    } catch (e) {
      // Text format parser fallback
      return parseTextPlan(rawInput);
    }
  } else {
    jsonPlan = rawInput;
  }

  // Handle Postgres JSON: [{ "Plan": { ... } }]
  if (Array.isArray(jsonPlan) && jsonPlan[0] && jsonPlan[0].Plan) {
    return normalizePostgresNode(jsonPlan[0].Plan);
  }

  // Postgres single object
  if (jsonPlan && jsonPlan.Plan) {
    return normalizePostgresNode(jsonPlan.Plan);
  }

  // MySQL JSON: { "query_block": { ... } }
  if (jsonPlan && jsonPlan.query_block) {
    return normalizeMysqlNode(jsonPlan.query_block);
  }

  return normalizePostgresNode(jsonPlan);
}

function normalizePostgresNode(node) {
  if (!node) return null;

  const nodeType = node['Node Type'] || 'Unknown Operator';
  const totalCost = node['Total Cost'] || 0;
  const startupCost = node['Startup Cost'] || 0;
  const actualTotalTime = node['Actual Total Time'] || 0;
  const actualRows = node['Actual Rows'] || 0;
  const plannedRows = node['Plan Rows'] || 0;
  const relationName = node['Relation Name'] || null;
  const alias = node['Alias'] || null;
  const indexName = node['Index Name'] || null;
  const filter = node['Filter'] || null;
  const rowsRemovedByFilter = node['Rows Removed by Filter'] || 0;
  const hashCond = node['Hash Cond'] || null;
  const joinType = node['Join Type'] || null;

  const children = (node.Plans || []).map(normalizePostgresNode).filter(Boolean);

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
  const children = [];
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
    } else if (block.table.key) {
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
    children
  };
}

function parseTextPlan(text) {
  // Simple fallback for standard indented text explain lines
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const root = {
    nodeType: lines[0] ? lines[0].trim() : 'Root',
    relationName: null,
    actualRows: 0,
    totalCost: 100,
    children: []
  };
  return root;
}

module.exports = {
  normalizePlan
};
