import { apiRequest } from '@/api/client'
import type { Agent, AgentVersion, AgentWithActiveVersion } from '@/types/api'

export function listAgents(workspaceId: number) {
  return apiRequest<{ agents: Agent[] }>(`/workspaces/${workspaceId}/agents`)
}

export function getAgent(workspaceId: number, agentId: number) {
  return apiRequest<{ agent: AgentWithActiveVersion }>(`/workspaces/${workspaceId}/agents/${agentId}`)
}

export function createAgent(
  workspaceId: number,
  input: { name: string; description?: string }
) {
  return apiRequest<{ agent: Agent }>(`/workspaces/${workspaceId}/agents`, {
    method: 'POST',
    body: input,
  })
}

export function updateAgent(
  workspaceId: number,
  agentId: number,
  input: { name?: string; description?: string }
) {
  return apiRequest<{ agent: Agent }>(`/workspaces/${workspaceId}/agents/${agentId}`, {
    method: 'PATCH',
    body: input,
  })
}

export function deleteAgent(workspaceId: number, agentId: number) {
  return apiRequest<void>(`/workspaces/${workspaceId}/agents/${agentId}`, {
    method: 'DELETE',
  })
}

export function listAgentVersions(workspaceId: number, agentId: number) {
  return apiRequest<{ versions: AgentVersion[] }>(`/workspaces/${workspaceId}/agents/${agentId}/versions`)
}

export function createAgentVersion(
  workspaceId: number,
  agentId: number,
  input: { systemInstruction: string; config: Record<string, unknown> }
) {
  return apiRequest<{ version: AgentVersion }>(`/workspaces/${workspaceId}/agents/${agentId}/versions`, {
    method: 'POST',
    body: input,
  })
}

export function setActiveAgentVersion(workspaceId: number, agentId: number, versionId: number) {
  return apiRequest<{ agent: Agent }>(`/workspaces/${workspaceId}/agents/${agentId}/active-version`, {
    method: 'PATCH',
    body: { versionId },
  })
}
