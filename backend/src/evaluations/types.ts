// ─── Evaluator Types ─────────────────────────────────────────────────────────

export interface EvalResult {
  passed: boolean;
  details?: string;
}

export interface EvaluationContext {
  outputText: string;
}

export interface Evaluator {
  evaluate(
    context: EvaluationContext,
    parameters: Record<string, unknown>
  ): EvalResult;
}

// ─── Offline Evaluation Input ────────────────────────────────────────────────

export interface OfflineEvaluationInput {
  workspaceId: number;
  agentVersionIds: number[];
  datasetId: number;
  evaluationDefinitionIds: number[];
  triggeredByUserId: number;
}

// ─── Evaluation Run Summary ──────────────────────────────────────────────────

export type EvaluationRunSummary = {
  evaluationRunId: number;
  status: "COMPLETED";
  summary: {
    totalResults: number;
    passed: number;
    failed: number;
    failedExecutions: number;
    agentVersionsEvaluated: number;
    dataItemsProcessed: number;
    evaluationDefinitionsApplied: number;
  };
} | {
  evaluationRunId: number;
  status: "FAILED";
  error: string;
};
