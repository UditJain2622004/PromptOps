export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'USER'
export type WorkspaceMemberRole = WorkspaceRole
export type DatasetScope = 'WORKSPACE' | 'AGENT'
export type EvaluationScope = 'WORKSPACE' | 'AGENT'
export type DataItemType = 'TYPE1' | 'TYPE2'
export type EvaluationRunStatus =
  | 'CREATED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT'

export interface User {
  id: number
  name: string
  email: string
  createdAt?: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface Workspace {
  id: number
  name: string
  createdAt: string
  updatedAt: string
  role: WorkspaceRole
}

export interface WorkspaceMember {
  userId: number
  email: string
  name: string
  role: WorkspaceRole
  createdAt: string
}

export interface PromptOpsApiKeyMetadata {
  id: number
  createdAt: string
  revokedAt: string | null
}

export interface CreatedPromptOpsApiKey {
  id: number
  key: string
  createdAt: string
}

export interface Agent {
  id: number
  name: string
  description?: string | null
  activeAgentVersionId?: number | null
  createdAt: string
  updatedAt: string
  workspaceId: number
}

export interface AgentVersion {
  id: number
  systemInstruction: string
  config: Record<string, unknown>
  createdAt: string
  createdById: number
  agentId: number
}

export interface AgentWithActiveVersion extends Agent {
  activeVersion?: AgentVersion | null
}

export interface Dataset {
  id: number
  name?: string | null
  scope: DatasetScope
  agentId?: number | null
  createdAt: string
  updatedAt: string
  workspaceId: number
}

export interface DataItem {
  id: number
  type: DataItemType
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
  datasetId: number
}

export interface EvaluationDefinition {
  id: number
  name?: string | null
  scope: EvaluationScope
  type: string
  parameters?: Record<string, unknown>
  definition: Record<string, unknown>
  agentId?: number | null
  createdAt: string
  updatedAt: string
  workspaceId: number
}

export interface EvaluationRun {
  id: number
  name?: string | null
  configSnapshot: {
    agentVersionIds: number[]
    datasetId: number
    evaluationDefinitionIds: number[]
  }
  status: EvaluationRunStatus
  mode: 'CHAT' | 'AGENTIC'
  createdAt: string
  createdById: number
  workspaceId: number
}

export interface EvaluationResultItem {
  id: number
  agentVersionId: number
  passed: boolean
  details: Record<string, unknown> | null
  createdAt: string
  evaluationDefinition: {
    id: number
    name: string | null
    type: string
  }
}

export interface EvaluationRunSummaryResponse {
  run: EvaluationRun
  summary: {
    totalResults: number
    passed: number
    failed: number
    passRate: number
  }
}

export interface EvaluationRunResultsResponse {
  run: EvaluationRun
  results: EvaluationResultItem[]
}

export interface GatewayExecuteResponse {
  model: string
  output: string
  finishReason?: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}
