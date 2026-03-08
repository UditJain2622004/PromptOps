import {
  changeWorkspaceMemberRole,
  createWorkspaceApiKey,
  inviteWorkspaceMember,
  listWorkspaceApiKeys,
  listWorkspaceMembers,
  revokeWorkspaceApiKey,
} from '@/api/workspaces'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable'
import {
  Field,
  Input,
  PrimaryButton,
  SecondaryButton,
  Select,
} from '@/components/FormControls'
import { Modal } from '@/components/Modal'
import { PageSection } from '@/components/PageSection'
import { StatusBadge } from '@/components/StatusBadge'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useApi } from '@/hooks/useApi'
import type { PromptOpsApiKeyMetadata, WorkspaceMemberRole } from '@/types/api'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

export function SettingsPage() {
  const params = useParams()
  const workspaceId = Number.parseInt(params.workspaceId ?? '', 10)
  const { currentWorkspace } = useWorkspace()
  const membersQuery = useApi(() => listWorkspaceMembers(workspaceId), [workspaceId])
  const apiKeysQuery = useApi(() => listWorkspaceApiKeys(workspaceId), [workspaceId])

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceMemberRole>('USER')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<PromptOpsApiKeyMetadata | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canManage = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN'

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    try {
      await inviteWorkspaceMember(workspaceId, { email: inviteEmail, role: inviteRole })
      setInviteEmail('')
      setInviteRole('USER')
      await membersQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to invite member')
    }
  }

  async function handleRoleChange(memberUserId: number, role: WorkspaceMemberRole) {
    setActionError(null)
    try {
      await changeWorkspaceMemberRole(workspaceId, memberUserId, role)
      await membersQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  async function handleCreateApiKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    try {
      const response = await createWorkspaceApiKey(workspaceId)
      setCreatedKey(response.apiKey.key)
      await apiKeysQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create API key')
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    try {
      await revokeWorkspaceApiKey(workspaceId, revokeTarget.id)
      setRevokeTarget(null)
      await apiKeysQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to revoke API key')
    }
  }

  return (
    <div className="space-y-8">
      {actionError ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{actionError}</div>
      ) : null}

      <PageSection title="Members" description="Invite collaborators and manage workspace roles.">
        <form
          onSubmit={handleInvite}
          className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_180px_auto]"
        >
          <Field label="Email">
            <Input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} disabled={!canManage} required />
          </Field>
          <Field label="Role">
            <Select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as WorkspaceMemberRole)} disabled={!canManage}>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="OWNER">OWNER</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <PrimaryButton type="submit" disabled={!canManage}>
              Invite
            </PrimaryButton>
          </div>
        </form>

        <DataTable
          rows={membersQuery.data?.members ?? []}
          getRowKey={(member) => member.userId}
          columns={[
            {
              key: 'user',
              header: 'Member',
              render: (member) => (
                <div>
                  <p className="font-medium text-slate-900">{member.name ?? `User ${member.userId}`}</p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>
              ),
            },
            { key: 'role', header: 'Role', render: (member) => <StatusBadge value={member.role} /> },
            {
              key: 'changeRole',
              header: 'Change role',
              render: (member) => (
                <Select
                  value={member.role}
                  onChange={(event) => handleRoleChange(member.userId, event.target.value as WorkspaceMemberRole)}
                  disabled={!canManage}
                  className="min-w-32"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="OWNER">OWNER</option>
                </Select>
              ),
            },
          ]}
        />
      </PageSection>

      <PageSection title="PromptOps API Keys" description="Create proxy API keys for BaseURL integrations and revoke them when needed.">
        <form
          onSubmit={handleCreateApiKey}
          className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto]"
        >
          <div className="flex items-center text-sm text-slate-600">
            Create a new PromptOps proxy key for this workspace.
          </div>
          <div className="flex items-end">
            <PrimaryButton type="submit" disabled={!canManage}>
              Create key
            </PrimaryButton>
          </div>
        </form>

        <DataTable
          rows={apiKeysQuery.data?.apiKeys ?? []}
          getRowKey={(apiKey) => apiKey.id}
          columns={[
            { key: 'name', header: 'Key', render: (apiKey) => `API Key ${apiKey.id}` },
            {
              key: 'createdAt',
              header: 'Created',
              render: (apiKey) => new Date(apiKey.createdAt).toLocaleString(),
            },
            {
              key: 'status',
              header: 'Status',
              render: (apiKey) =>
                apiKey.revokedAt ? (
                  <StatusBadge value="REVOKED" />
                ) : (
                  <StatusBadge value="ACTIVE" />
                ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (apiKey) =>
                apiKey.revokedAt ? null : (
                  <SecondaryButton type="button" onClick={() => setRevokeTarget(apiKey)} disabled={!canManage}>
                    Revoke
                  </SecondaryButton>
                ),
            },
          ]}
        />
      </PageSection>

      <Modal open={Boolean(createdKey)} title="API key created" onClose={() => setCreatedKey(null)}>
        <p className="text-sm text-slate-600">
          Copy this key now. For security it cannot be shown again after you close this dialog.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-100">
          {createdKey}
        </pre>
      </Modal>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Revoke API key"
        message={`Revoke API Key ${revokeTarget?.id ?? ''}? Proxy calls using it will stop working.`}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        confirmLabel="Revoke key"
      />
    </div>
  )
}
