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
export declare function normalizePlan(rawInput: any): ExecutionPlanNode | null;
//# sourceMappingURL=plan-normalizer.d.ts.map