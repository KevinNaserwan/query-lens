# query-lens 🔍

> **Zero-dependency SQL Execution Plan Analyzer, Visual Tree Heatmap & Automated Index Heuristic Advisor.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://img.shields.io/badge/Node.js-%3E%3D16.0.0-green.svg)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Release-v1.0.0-blue.svg)](https://github.com/KevinNaserwan/query-lens)

---

## 📌 Background & Motivation
Optimizing slow database queries is a daily ritual for backend and fullstack developers. However, the raw output from `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` in PostgreSQL or `EXPLAIN FORMAT=JSON` in MySQL is a dense, deeply nested JSON or ASCII blob that takes significant effort to comprehend.

Developers frequently miss:
1. **Hidden Sequential Scans** buried 6 levels deep inside a Nested Loop or Hash Join.
2. **Planner Estimation Discrepancies** where expected row counts deviate by $100\times$ from actual scanned rows due to stale statistics.
3. The exact column combinations needed to create composite or partial indexes to resolve the bottlenecks.

**`query-lens`** is an ultra-lightweight, zero-dependency CLI that normalizes execution plans, renders an interactive colored tree hierarchy, highlights bottlenecks, and automatically generates ready-to-run **`CREATE INDEX CONCURRENTLY`** DDL statements.

---

## ✨ Features

* **🌳 Unified Execution Plan Tree:** Parses PostgreSQL and MySQL `EXPLAIN JSON` outputs into a clean terminal tree representation with cost badges, execution time, and scanned rows.
* **🚨 Automated Bottleneck Detection:**
  * Flags high-volume **Full Table Scans / Sequential Scans** with row filtering penalties.
  * Detects **Planner Estimation Errors** (stale table statistics) where `Planned Rows` differs drastically from `Actual Rows`.
  * Warns on expensive **Nested Loop** inner scans.
* **💡 Heuristic Index Advisor:** Automatically extracts filter conditions and writes production-ready index creation DDL statements.
* **📊 Standalone HTML Reports:** Generates zero-dependency, self-contained HTML visual audit reports (`-o report.html`) suitable for attaching to Pull Requests or sharing with DBA teams.

---

## 🚀 Installation & Usage

### Global Installation
```bash
npm install -g query-lens
# Or execute on-the-fly via npx:
npx query-lens --help
```

### Analyzing Execution Plans

```bash
# Analyze a saved EXPLAIN JSON file:
query-lens examples/postgres-slow-query.json

# Generate an interactive HTML audit report:
query-lens examples/postgres-slow-query.json -o report.html

# Pipe directly from psql or mysql CLI:
psql -d mydb -c "EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM orders WHERE status = 'PENDING';" | query-lens --stdin
```

---

## 🖥️ Terminal Output Example

```text
=== 🔍 QueryLens: SQL Execution Plan Visualizer ===

└── Hash Join [Cost: 8450.3] [Time: 142.35ms] [Rows: 420]
    ├── Seq Scan on orders [Cost: 6890.0] [Time: 85.12ms] [Rows: 14,850]
    │   Filter: (status = 'PENDING')
    └── Hash [Cost: 820.0] [Time: 12.40ms] [Rows: 2,500]
        └── Index Scan on users (users_pkey) [Cost: 820.0] [Time: 8.10ms] [Rows: 2,500]

--- Performance Analysis & Diagnostic Report ---
 [CRITICAL] Full table scan on "orders" examined 14,850 rows (discarded 85,150 via filter).

--- 💡 Recommended Index Fixes (DDL) ---

# High: Eliminates full table scan and converts operator to Bitmap Index / Index Scan.
CREATE INDEX CONCURRENTLY idx_orders_status ON orders (status);

✔ Visual HTML report successfully saved to: examples/report.html
```

---

## 🧪 Testing & Verification

Run the test suite:
```bash
npm test
```

Run demo analysis:
```bash
npm run demo
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).

Authored with ❤️ by [Kevin Naserwan](https://github.com/KevinNaserwan).
