import { apiRequest } from '@/api/client'
import type { GatewayExecuteResponse } from '@/types/api'

export function executeAgent(
  workspaceId: number,
  agentId: number,
  input: {
    messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>
    versionId?: number
    overrides?: {
      temperature?: number
      topP?: number
      maxTokens?: number
      model?: string
    }
  }
) {
  return apiRequest<GatewayExecuteResponse>(`/workspaces/${workspaceId}/gateway/agents/${agentId}/execute`, {
    method: 'POST',
    body: input,
  })
}
