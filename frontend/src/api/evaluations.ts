import { apiRequest } from '@/api/client'
import type {
  EvaluationDefinition,
  EvaluationRun,
  EvaluationRunResultsResponse,
  EvaluationRunSummaryResponse,
  EvaluationScope,
} from '@/types/api'

export function listEvaluationDefinitions(workspaceId: number) {
  return apiRequest<{ definitions: EvaluationDefinition[] }>(
    `/workspaces/${workspaceId}/evaluation-definitions`
  )
}

export function createEvaluationDefinition(
  workspaceId: number,
  input: {
    name?: string
    scope: EvaluationScope
    agentId?: number
    type: string
    parameters: Record<string, unknown>
    definition: Record<string, unknown>
  }
) {
  return apiRequest<{ definition: EvaluationDefinition }>(
    `/workspaces/${workspaceId}/evaluation-definitions`,
    {
      method: 'POST',
      body: input,
    }
  )
}

export function updateEvaluationDefinition(
  workspaceId: number,
  definitionId: number,
  input: {
    name?: string
    scope?: EvaluationScope
    agentId?: number | null
    type?: string
    parameters?: Record<string, unknown>
    definition?: Record<string, unknown>
  }
) {
  return apiRequest<{ definition: EvaluationDefinition }>(
    `/workspaces/${workspaceId}/evaluation-definitions/${definitionId}`,
    {
      method: 'PATCH',
      body: input,
    }
  )
}

export function deleteEvaluationDefinition(workspaceId: number, definitionId: number) {
  return apiRequest<void>(`/workspaces/${workspaceId}/evaluation-definitions/${definitionId}`, {
    method: 'DELETE',
  })
}

export function createEvaluationRun(
  workspaceId: number,
  input: {
    name?: string
    configSnapshot: {
      agentVersionIds: number[]
      datasetId: number
      evaluationDefinitionIds: number[]
    }
  }
) {
  return apiRequest<{ run: EvaluationRun }>(`/workspaces/${workspaceId}/evaluation-runs`, {
    method: 'POST',
    body: input,
  })
}

export function listEvaluationRuns(workspaceId: number) {
  return apiRequest<{ runs: EvaluationRun[] }>(`/workspaces/${workspaceId}/evaluation-runs`)
}

export function getEvaluationRunSummary(workspaceId: number, runId: number) {
  return apiRequest<EvaluationRunSummaryResponse>(
    `/workspaces/${workspaceId}/evaluation-runs/${runId}/summary`
  )
}

export function getEvaluationRunResults(
  workspaceId: number,
  runId: number,
  agentVersionId?: number
) {
  const query = agentVersionId ? `?agentVersionId=${agentVersionId}` : ''
  return apiRequest<EvaluationRunResultsResponse>(
    `/workspaces/${workspaceId}/evaluation-runs/${runId}/results${query}`
  )
}
