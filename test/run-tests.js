'use strict';

const assert = require('assert');
const { normalizePlan } = require('../dist/plan-normalizer');
const { Advisor } = require('../dist/advisor');
const { renderCliTree, generateHtmlReport } = require('../dist/renderer');

console.log('Running query-lens Test Suite...');

// Test 1: Plan Normalization
{
  const rawPostgres = [{
    Plan: {
      "Node Type": "Seq Scan",
      "Relation Name": "payments",
      "Actual Rows": 5000,
      "Plan Rows": 5000,
      "Total Cost": 150.0,
      "Filter": "(amount > 1000)"
    }
  }];

  const norm = normalizePlan(rawPostgres);
  assert.strictEqual(norm.nodeType, 'Seq Scan');
  assert.strictEqual(norm.relationName, 'payments');
  assert.strictEqual(norm.actualRows, 5000);
  console.log('✔ Test 1: PostgreSQL plan normalization passed');
}

// Test 2: Advisor Bottleneck Detection & Index Recommendation
{
  const sampleNode = {
    nodeType: 'Seq Scan',
    relationName: 'transactions',
    actualRows: 25000,
    plannedRows: 25000,
    rowsRemovedByFilter: 150000,
    filter: "(created_at >= '2026-01-01')",
    totalCost: 12500,
    children: []
  };

  const advisor = new Advisor();
  const analysis = advisor.analyze(sampleNode);

  assert.strictEqual(analysis.issues.length, 1);
  assert.strictEqual(analysis.issues[0].severity, 'CRITICAL');
  assert.strictEqual(analysis.recommendations.length, 1);
  assert(analysis.recommendations[0].sql.includes('idx_transactions_created_at'), 'Index DDL must match target column');
  console.log('✔ Test 2: Heuristic Advisor & Index Recommendation passed');
}

// Test 3: Tree and HTML Rendering
{
  const testNode = {
    nodeType: 'Index Scan',
    relationName: 'users',
    indexName: 'users_pkey',
    totalCost: 15.5,
    actualTotalTime: 0.8,
    actualRows: 1,
    children: []
  };

  const tree = renderCliTree(testNode);
  assert(tree.includes('Index Scan'), 'Tree output must render node type');

  const html = generateHtmlReport(testNode, { issues: [], recommendations: [] });
  assert(html.includes('QueryLens'), 'HTML report must contain QueryLens title');
  console.log('✔ Test 3: Tree & HTML report renderers passed');
}

console.log('All tests passed successfully (3/3)!');
