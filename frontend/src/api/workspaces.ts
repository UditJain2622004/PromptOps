import { apiRequest } from '@/api/client'
import type {
  CreatedPromptOpsApiKey,
  PromptOpsApiKeyMetadata,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '@/types/api'

export function listWorkspaces() {
  return apiRequest<{ workspaces: Workspace[] }>('/workspaces')
}

export function createWorkspace(name: string) {
  return apiRequest<{ workspace: Workspace }>('/workspaces', {
    method: 'POST',
    body: { name },
  })
}

export function deleteWorkspace(workspaceId: number) {
  return apiRequest<void>(`/workspaces/${workspaceId}`, {
    method: 'DELETE',
  })
}

export function listWorkspaceMembers(workspaceId: number) {
  return apiRequest<{ members: WorkspaceMember[] }>(`/workspaces/${workspaceId}/users`)
}

export function inviteWorkspaceMember(
  workspaceId: number,
  input: { email: string; role?: WorkspaceRole }
) {
  return apiRequest<{ member: WorkspaceMember }>(`/workspaces/${workspaceId}/invite`, {
    method: 'POST',
    body: input,
  })
}

export function changeWorkspaceMemberRole(
  workspaceId: number,
  userId: number,
  role: WorkspaceRole
) {
  return apiRequest<{ member: WorkspaceMember }>(`/workspaces/${workspaceId}/users/${userId}`, {
    method: 'PATCH',
    body: { role },
  })
}

export function listWorkspaceApiKeys(workspaceId: number) {
  return apiRequest<{ apiKeys: PromptOpsApiKeyMetadata[] }>(`/workspaces/${workspaceId}/api-keys`)
}

export function createWorkspaceApiKey(workspaceId: number) {
  return apiRequest<{ apiKey: CreatedPromptOpsApiKey }>(`/workspaces/${workspaceId}/api-keys`, {
    method: 'POST',
  })
}

export function revokeWorkspaceApiKey(workspaceId: number, apiKeyId: number) {
  return apiRequest<void>(`/workspaces/${workspaceId}/api-keys/${apiKeyId}`, {
    method: 'DELETE',
  })
}
