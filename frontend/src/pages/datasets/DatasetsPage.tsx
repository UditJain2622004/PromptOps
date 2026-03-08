import {
  createDataset,
  deleteDataset,
  listDatasets,
} from '@/api/datasets'
import { listAgents } from '@/api/agents'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { Field, Input, PrimaryButton, SecondaryButton, Select } from '@/components/FormControls'
import { Modal } from '@/components/Modal'
import { PageSection } from '@/components/PageSection'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useApi } from '@/hooks/useApi'
import type { Dataset, DatasetScope } from '@/types/api'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

export function DatasetsPage() {
  const params = useParams()
  const workspaceId = Number.parseInt(params.workspaceId ?? '', 10)
  const { currentWorkspace } = useWorkspace()
  const datasetsQuery = useApi(() => listDatasets(workspaceId), [workspaceId])
  const agentsQuery = useApi(() => listAgents(workspaceId), [workspaceId])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null)
  const [name, setName] = useState('')
  const [scope, setScope] = useState<DatasetScope>('WORKSPACE')
  const [agentId, setAgentId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const datasets = useMemo(() => datasetsQuery.data?.datasets ?? [], [datasetsQuery.data])
  const agents = useMemo(() => agentsQuery.data?.agents ?? [], [agentsQuery.data])
  const canWrite = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN'
  const canDelete = currentWorkspace?.role === 'OWNER'

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setActionError(null)
    try {
      await createDataset(workspaceId, {
        name: name || undefined,
        scope,
        agentId: scope === 'AGENT' && agentId ? Number.parseInt(agentId, 10) : undefined,
      })
      setName('')
      setAgentId('')
      setScope('WORKSPACE')
      setIsCreateOpen(false)
      await datasetsQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create dataset')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteDataset(workspaceId, deleteTarget.id)
      setDeleteTarget(null)
      await datasetsQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete dataset')
    }
  }

  return (
    <PageSection
      title="Datasets"
      description="Organize prompt inputs and examples for evaluation runs."
      actions={
        canWrite ? (
          <PrimaryButton type="button" onClick={() => setIsCreateOpen(true)}>
            New Dataset
          </PrimaryButton>
        ) : null
      }
    >
      {actionError ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{actionError}</div>
      ) : null}
      {datasetsQuery.loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading datasets...
        </div>
      ) : datasets.length === 0 ? (
        <EmptyState title="No datasets yet" description="Create a dataset to collect prompts and examples." />
      ) : (
        <DataTable
          rows={datasets}
          getRowKey={(dataset) => dataset.id}
          columns={[
            {
              key: 'name',
              header: 'Dataset',
              render: (dataset) => (
                <div>
                  <p className="font-medium text-slate-900">{dataset.name ?? `Dataset ${dataset.id}`}</p>
                  <p className="text-xs text-slate-500">Scope: {dataset.scope}</p>
                </div>
              ),
            },
            {
              key: 'agentId',
              header: 'Agent',
              render: (dataset) => dataset.agentId ?? 'Workspace',
            },
            {
              key: 'updatedAt',
              header: 'Updated',
              render: (dataset) => new Date(dataset.updatedAt).toLocaleString(),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (dataset) => (
                <div className="flex gap-2">
                  <Link
                    to={`/workspaces/${workspaceId}/datasets/${dataset.id}`}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                  >
                    Open
                  </Link>
                  {canDelete ? (
                    <SecondaryButton type="button" onClick={() => setDeleteTarget(dataset)} className="px-3 py-2 text-xs">
                      Delete
                    </SecondaryButton>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal open={isCreateOpen} title="Create dataset" onClose={() => setIsCreateOpen(false)}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Scope">
            <Select value={scope} onChange={(event) => setScope(event.target.value as DatasetScope)}>
              <option value="WORKSPACE">WORKSPACE</option>
              <option value="AGENT">AGENT</option>
            </Select>
          </Field>
          {scope === 'AGENT' ? (
            <Field label="Agent">
              <Select value={agentId} onChange={(event) => setAgentId(event.target.value)} required>
                <option value="">Select an agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
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
        title="Delete dataset"
        message={`Delete "${deleteTarget?.name ?? ''}" and all of its items?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Delete dataset"
      />
    </PageSection>
  )
}
