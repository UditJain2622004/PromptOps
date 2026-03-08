import {
  createAgent,
  deleteAgent,
  listAgents,
} from '@/api/agents'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable'
import { Field, Input, PrimaryButton, SecondaryButton } from '@/components/FormControls'
import { Modal } from '@/components/Modal'
import { EmptyState } from '@/components/EmptyState'
import { PageSection } from '@/components/PageSection'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useApi } from '@/hooks/useApi'
import type { Agent } from '@/types/api'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

export function AgentsPage() {
  const { workspaceId: workspaceIdParam } = useParams()
  const workspaceId = Number.parseInt(workspaceIdParam ?? '', 10)
  const { currentWorkspace } = useWorkspace()
  const { data, loading, error, refetch } = useApi(() => listAgents(workspaceId), [workspaceId])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const agents = useMemo(() => data?.agents ?? [], [data])
  const canWrite = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN'
  const canDelete = currentWorkspace?.role === 'OWNER'

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setActionError(null)
    try {
      await createAgent(workspaceId, {
        name,
        description: description || undefined,
      })
      setName('')
      setDescription('')
      setIsCreateOpen(false)
      await refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create agent')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteAgent(workspaceId, deleteTarget.id)
      setDeleteTarget(null)
      await refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete agent')
    }
  }

  return (
    <PageSection
      title="Agents"
      description="Manage workspace agents and open an agent to work with immutable versions."
      actions={
        canWrite ? (
          <PrimaryButton type="button" onClick={() => setIsCreateOpen(true)}>
            New Agent
          </PrimaryButton>
        ) : null
      }
    >
      {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
      {actionError ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{actionError}</div>
      ) : null}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading agents...
        </div>
      ) : agents.length === 0 ? (
        <EmptyState title="No agents yet" description="Create your first agent to start versioning prompts and configs." />
      ) : (
        <DataTable
          rows={agents}
          getRowKey={(agent) => agent.id}
          columns={[
            {
              key: 'name',
              header: 'Agent',
              render: (agent) => (
                <div>
                  <p className="font-medium text-slate-900">{agent.name}</p>
                  <p className="text-xs text-slate-500">{agent.description ?? 'No description'}</p>
                </div>
              ),
            },
            {
              key: 'activeVersion',
              header: 'Active Version',
              render: (agent) => agent.activeAgentVersionId ?? 'Not set',
            },
            {
              key: 'updatedAt',
              header: 'Updated',
              render: (agent) => new Date(agent.updatedAt).toLocaleString(),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (agent) => (
                <div className="flex gap-2">
                  <Link
                    to={`/workspaces/${workspaceId}/agents/${agent.id}`}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                  >
                    Open
                  </Link>
                  {canDelete ? (
                    <SecondaryButton type="button" onClick={() => setDeleteTarget(agent)} className="px-3 py-2 text-xs">
                      Delete
                    </SecondaryButton>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal open={isCreateOpen} title="Create agent" onClose={() => setIsCreateOpen(false)}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Description">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional"
            />
          </Field>
          <div className="flex justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete agent"
        message={`Delete "${deleteTarget?.name ?? ''}" and all of its versions?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Delete agent"
      />
    </PageSection>
  )
}
