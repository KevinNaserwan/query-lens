import { ExecutionPlanNode } from './plan-normalizer';
export interface PerformanceIssue {
    severity: 'CRITICAL' | 'WARNING';
    operator: string;
    table: string | null;
    detail: string;
}
export interface IndexRecommendation {
    type: string;
    table: string;
    columns: string[];
    sql: string;
    impact: string;
}
export interface AnalysisReport {
    issues: PerformanceIssue[];
    recommendations: IndexRecommendation[];
    summary: {
        totalIssues: number;
        criticalCount: number;
        warningCount: number;
    };
}
export declare class Advisor {
    private issues;
    private recommendations;
    analyze(rootNode: ExecutionPlanNode): AnalysisReport;
    private traverse;
}
//# sourceMappingURL=advisor.d.ts.map