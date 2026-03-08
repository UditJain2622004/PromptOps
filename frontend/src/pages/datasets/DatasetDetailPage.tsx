import {
  createDataItem,
  deleteDataItem,
  getDataset,
  listDataItems,
  updateDataItem,
  updateDataset,
} from '@/api/datasets'
import { listAgents } from '@/api/agents'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import {
  Field,
  Input,
  PrimaryButton,
  SecondaryButton,
  Select,
  Textarea,
} from '@/components/FormControls'
import { PageSection } from '@/components/PageSection'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useApi } from '@/hooks/useApi'
import type { DataItem, DatasetScope, DataItemType } from '@/types/api'
import { parseJsonInput, stringifyJson } from '@/utils/json'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

export function DatasetDetailPage() {
  const params = useParams()
  const workspaceId = Number.parseInt(params.workspaceId ?? '', 10)
  const datasetId = Number.parseInt(params.datasetId ?? '', 10)
  const { currentWorkspace } = useWorkspace()
  const datasetQuery = useApi(() => getDataset(workspaceId, datasetId), [workspaceId, datasetId])
  const itemsQuery = useApi(() => listDataItems(workspaceId, datasetId), [workspaceId, datasetId])
  const agentsQuery = useApi(() => listAgents(workspaceId), [workspaceId])

  const [draftName, setDraftName] = useState<string | null>(null)
  const [draftScope, setDraftScope] = useState<DatasetScope | null>(null)
  const [draftAgentId, setDraftAgentId] = useState<string | null>(null)
  const [itemType, setItemType] = useState<DataItemType>('TYPE1')
  const [itemJson, setItemJson] = useState('{\n  "input": ""\n}')
  const [editItem, setEditItem] = useState<DataItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DataItem | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN'
  const canDelete = currentWorkspace?.role === 'OWNER'
  const items = useMemo(() => itemsQuery.data?.dataItems ?? [], [itemsQuery.data])
  const agents = useMemo(() => agentsQuery.data?.agents ?? [], [agentsQuery.data])
  const dataset = datasetQuery.data?.dataset
  const name = draftName ?? dataset?.name ?? ''
  const scope = draftScope ?? dataset?.scope ?? 'WORKSPACE'
  const agentId = draftAgentId ?? (dataset?.agentId ? String(dataset.agentId) : '')

  async function handleSaveDataset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    try {
      await updateDataset(workspaceId, datasetId, {
        name: name || undefined,
        scope,
        agentId: scope === 'AGENT' ? Number.parseInt(agentId, 10) : null,
      })
      setDraftName(null)
      setDraftScope(null)
      setDraftAgentId(null)
      await datasetQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update dataset')
    }
  }

  async function handleSaveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    try {
      const data = parseJsonInput<Record<string, unknown>>(itemJson, 'Data item')
      if (editItem) {
        await updateDataItem(workspaceId, datasetId, editItem.id, {
          type: itemType,
          data,
        })
      } else {
        await createDataItem(workspaceId, datasetId, {
          type: itemType,
          data,
        })
      }
      setEditItem(null)
      setItemType('TYPE1')
      setItemJson('{\n  "input": ""\n}')
      await itemsQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save data item')
    }
  }

  function handleEditItem(item: DataItem) {
    setEditItem(item)
    setItemType(item.type)
    setItemJson(stringifyJson(item.data))
  }

  async function handleDeleteItem() {
    if (!deleteTarget) return
    try {
      await deleteDataItem(workspaceId, datasetId, deleteTarget.id)
      setDeleteTarget(null)
      await itemsQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete data item')
    }
  }

  if (datasetQuery.loading || itemsQuery.loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading dataset...
      </div>
    )
  }

  if (datasetQuery.error) {
    return <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{datasetQuery.error}</div>
  }

  if (!dataset) {
    return <EmptyState title="Dataset not found" description="This dataset may have been removed." />
  }

  return (
    <div className="space-y-8">
      {actionError ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{actionError}</div>
      ) : null}

      <PageSection title={dataset.name ?? `Dataset ${datasetId}`} description="Configure dataset metadata and manage data items.">
        <form
          onSubmit={handleSaveDataset}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3"
        >
          <Field label="Name">
            <Input value={name} onChange={(event) => setDraftName(event.target.value)} disabled={!canWrite} />
          </Field>
          <Field label="Scope">
            <Select value={scope} onChange={(event) => setDraftScope(event.target.value as DatasetScope)} disabled={!canWrite}>
              <option value="WORKSPACE">WORKSPACE</option>
              <option value="AGENT">AGENT</option>
            </Select>
          </Field>
          <Field label="Agent">
            <Select
              value={agentId}
              onChange={(event) => setDraftAgentId(event.target.value)}
              disabled={!canWrite || scope !== 'AGENT'}
            >
              <option value="">Workspace-level dataset</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="md:col-span-3 flex justify-end">
            <PrimaryButton type="submit" disabled={!canWrite}>
              Save dataset
            </PrimaryButton>
          </div>
        </form>
      </PageSection>

      <PageSection title="Data items" description="Each item is a JSON payload used as evaluation input.">
        {items.length === 0 ? (
          <EmptyState title="No data items yet" description="Add examples below to populate this dataset." />
        ) : (
          <DataTable
            rows={items}
            getRowKey={(item) => item.id}
            columns={[
              { key: 'id', header: 'ID', render: (item) => item.id },
              { key: 'type', header: 'Type', render: (item) => item.type },
              {
                key: 'data',
                header: 'Data',
                render: (item) => (
                  <pre className="max-w-xl overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                    {stringifyJson(item.data.input)}
                  </pre>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (item) => (
                  <div className="flex gap-2">
                    {canWrite ? (
                      <PrimaryButton type="button" onClick={() => handleEditItem(item)} className="px-3 py-2 text-xs">
                        Edit
                      </PrimaryButton>
                    ) : null}
                    {canDelete ? (
                      <SecondaryButton type="button" onClick={() => setDeleteTarget(item)} className="px-3 py-2 text-xs">
                        Delete
                      </SecondaryButton>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        )}
      </PageSection>

      <PageSection
        title={editItem ? `Edit item ${editItem.id}` : 'Add data item'}
        description="Use valid JSON. Common fields like input, prompt, and question are supported by the offline evaluator."
      >
        <form
          onSubmit={handleSaveItem}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <Field label="Type">
            <Select value={itemType} onChange={(event) => setItemType(event.target.value as DataItemType)} disabled={!canWrite}>
              <option value="TYPE1">TYPE1</option>
              <option value="TYPE2">TYPE2</option>
            </Select>
          </Field>
          <Field label="Data JSON">
            <Textarea rows={12} value={itemJson} onChange={(event) => setItemJson(event.target.value)} disabled={!canWrite} />
          </Field>
          <div className="flex justify-end gap-3">
            {editItem ? (
              <SecondaryButton type="button" onClick={() => setEditItem(null)}>
                Cancel edit
              </SecondaryButton>
            ) : null}
            <PrimaryButton type="submit" disabled={!canWrite}>
              {editItem ? 'Update item' : 'Add item'}
            </PrimaryButton>
          </div>
        </form>
      </PageSection>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete data item"
        message={`Delete item ${deleteTarget?.id ?? ''}?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteItem}
        confirmLabel="Delete item"
      />

    </div>
  )
}
