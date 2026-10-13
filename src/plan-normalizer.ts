export interface ExecutionPlanNode {
  nodeType: string;
  relationName: string | null;
  alias: string | null;
  indexName: string | null;
  filter: string | null;
  rowsRemovedByFilter: number;
  hashCond: string | null;
  joinType: string | null;
  totalCost: number;
  startupCost: number;
  actualTotalTime: number;
  actualRows: number;
  plannedRows: number;
  children: ExecutionPlanNode[];
}

export function normalizePlan(rawInput: any): ExecutionPlanNode | null {
  let jsonPlan: any = null;
  if (typeof rawInput === 'string') {
    try {
      jsonPlan = JSON.parse(rawInput);
    } catch {
      return parseTextPlan(rawInput);
    }
  } else {
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

function normalizePostgresNode(node: any): ExecutionPlanNode | null {
  if (!node) return null;

  const nodeType: string = node['Node Type'] || 'Unknown Operator';
  const totalCost: number = Number(node['Total Cost']) || 0;
  const startupCost: number = Number(node['Startup Cost']) || 0;
  const actualTotalTime: number = Number(node['Actual Total Time']) || 0;
  const actualRows: number = Number(node['Actual Rows']) || 0;
  const plannedRows: number = Number(node['Plan Rows']) || 0;
  const relationName: string | null = node['Relation Name'] || null;
  const alias: string | null = node['Alias'] || null;
  const indexName: string | null = node['Index Name'] || null;
  const filter: string | null = node['Filter'] || null;
  const rowsRemovedByFilter: number = Number(node['Rows Removed by Filter']) || 0;
  const hashCond: string | null = node['Hash Cond'] || null;
  const joinType: string | null = node['Join Type'] || null;

  const children: ExecutionPlanNode[] = (node.Plans || [])
    .map(normalizePostgresNode)
    .filter((n: ExecutionPlanNode | null): n is ExecutionPlanNode => n !== null);

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

function normalizeMysqlNode(block: any): ExecutionPlanNode {
  let relationName: string | null = null;
  let actualRows: number = 0;
  let totalCost: number = 0;
  let nodeType: string = 'TABLE SCAN';

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
    children: []
  };
}

function parseTextPlan(text: string): ExecutionPlanNode {
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
