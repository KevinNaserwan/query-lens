#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { normalizePlan } = require('../lib/plan-normalizer');
const { Advisor } = require('../lib/advisor');
const { renderCliTree, generateHtmlReport } = require('../lib/renderer');

function printUsage() {
  console.error(`
query-lens v1.0.0
Zero-dependency SQL Execution Plan Analyzer & Heuristic Index Advisor

Usage:
  query-lens <plan.json> [options]
  explain analyze ... | query-lens --stdin [options]

Options:
  -o, --output <file>    Generate and save visual HTML report to file (e.g. report.html)
  --json                 Output normalized diagnostic plan as JSON
  -v, --version          Print version information
  -h, --help             Print this help screen

Examples:
  query-lens examples/postgres-slow-query.json
  query-lens examples/postgres-slow-query.json -o report.html
`);
}

function main() {
  const args = process.argv.slice(2);
  let filePath = null;
  let htmlOutput = null;
  let jsonOutput = false;
  let readFromStdin = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    }
    if (arg === '-v' || arg === '--version') {
      console.log('query-lens v1.0.0');
      process.exit(0);
    }
    if (arg === '--json') {
      jsonOutput = true;
    }
    if (arg === '--stdin') {
      readFromStdin = true;
    }
    if ((arg === '-o' || arg === '--output') && args[i + 1]) {
      htmlOutput = args[++i];
    } else if (!arg.startsWith('-') && !filePath) {
      filePath = arg;
    }
  }

  function processPlanText(rawText) {
    const plan = normalizePlan(rawText);
    if (!plan) {
      console.error('Error: Could not parse or normalize execution plan.');
      process.exit(1);
    }

    const advisor = new Advisor();
    const analysis = advisor.analyze(plan);

    if (jsonOutput) {
      console.log(JSON.stringify({ plan, analysis }, null, 2));
      return;
    }

    console.log('\n\x1b[1;36m=== 🔍 QueryLens: SQL Execution Plan Visualizer ===\x1b[0m\n');
    console.log(renderCliTree(plan));
    console.log('\n\x1b[1;33m--- Performance Analysis & Diagnostic Report ---\x1b[0m');

    if (analysis.issues.length === 0) {
      console.log('\x1b[32m✔ No critical bottlenecks or missing indexes detected!\x1b[0m');
    } else {
      for (const issue of analysis.issues) {
        const badge = issue.severity === 'CRITICAL' ? '\x1b[31;1m[CRITICAL]\x1b[0m' : '\x1b[33m[WARNING]\x1b[0m';
        console.log(` ${badge} ${issue.detail}`);
      }
    }

    if (analysis.recommendations.length > 0) {
      console.log('\n\x1b[1;32m--- 💡 Recommended Index Fixes (DDL) ---\x1b[0m');
      for (const rec of analysis.recommendations) {
        console.log(`\n\x1b[1m# ${rec.impact}\x1b[0m`);
        console.log(`\x1b[32m${rec.sql}\x1b[0m`);
      }
    }
    console.log('');

    if (htmlOutput) {
      const html = generateHtmlReport(plan, analysis);
      fs.writeFileSync(htmlOutput, html, 'utf8');
      console.log(`\x1b[36m✔ Visual HTML report successfully saved to: ${htmlOutput}\x1b[0m\n`);
    }
  }

  if (readFromStdin || !filePath) {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => raw += chunk);
    process.stdin.on('end', () => processPlanText(raw));
  } else {
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    processPlanText(raw);
  }
}

main();
