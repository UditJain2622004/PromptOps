import {
  createEvaluationDefinition,
  deleteEvaluationDefinition,
  listEvaluationDefinitions,
  updateEvaluationDefinition,
} from '@/api/evaluations'
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
import { Modal } from '@/components/Modal'
import { PageSection } from '@/components/PageSection'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useApi } from '@/hooks/useApi'
import type { EvaluationDefinition, EvaluationScope } from '@/types/api'
import { parseJsonInput, stringifyJson } from '@/utils/json'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

const evaluatorTypes = [
  'contains_text',
  'not_contains_text',
  'min_length',
  'max_length',
  'regex_match',
] as const

export function EvalDefinitionsPage() {
  const params = useParams()
  const workspaceId = Number.parseInt(params.workspaceId ?? '', 10)
  const { currentWorkspace } = useWorkspace()
  const definitionsQuery = useApi(() => listEvaluationDefinitions(workspaceId), [workspaceId])
  const agentsQuery = useApi(() => listAgents(workspaceId), [workspaceId])

  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<EvaluationDefinition | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EvaluationDefinition | null>(null)
  const [name, setName] = useState('')
  const [scope, setScope] = useState<EvaluationScope>('WORKSPACE')
  const [agentId, setAgentId] = useState('')
  const [type, setType] = useState<(typeof evaluatorTypes)[number]>('contains_text')
  const [parametersJson, setParametersJson] = useState('{\n  "text": ""\n}')
  const [definitionJson, setDefinitionJson] = useState('{\n  "kind": "text-rule"\n}')
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN'
  const canDelete = currentWorkspace?.role === 'OWNER'
  const definitions = useMemo(() => definitionsQuery.data?.definitions ?? [], [definitionsQuery.data])
  const agents = useMemo(() => agentsQuery.data?.agents ?? [], [agentsQuery.data])

  function openCreate() {
    setEditing(null)
    setName('')
    setScope('WORKSPACE')
    setAgentId('')
    setType('contains_text')
    setParametersJson('{\n  "text": ""\n}')
    setDefinitionJson('{\n  "kind": "text-rule"\n}')
    setActionError(null)
    setIsOpen(true)
  }

  function openEdit(definition: EvaluationDefinition) {
    setEditing(definition)
    setName(definition.name ?? '')
    setScope(definition.scope)
    setAgentId(definition.agentId ? String(definition.agentId) : '')
    setType((definition.type as (typeof evaluatorTypes)[number]) ?? 'contains_text')
    setParametersJson(stringifyJson(definition.parameters ?? {}))
    setDefinitionJson(stringifyJson(definition.definition))
    setActionError(null)
    setIsOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    try {
      const payload = {
        name: name || undefined,
        scope,
        agentId: scope === 'AGENT' && agentId ? Number.parseInt(agentId, 10) : undefined,
        type,
        parameters: parseJsonInput<Record<string, unknown>>(parametersJson, 'Parameters'),
        definition: parseJsonInput<Record<string, unknown>>(definitionJson, 'Definition'),
      }

      if (editing) {
        await updateEvaluationDefinition(workspaceId, editing.id, payload)
      } else {
        await createEvaluationDefinition(workspaceId, payload)
      }

      setIsOpen(false)
      await definitionsQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save definition')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteEvaluationDefinition(workspaceId, deleteTarget.id)
      setDeleteTarget(null)
      await definitionsQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete definition')
    }
  }

  return (
    <PageSection
      title="Evaluation Definitions"
      description="Create reusable evaluator rules that can be applied across datasets and agent versions."
      actions={
        canWrite ? (
          <PrimaryButton type="button" onClick={openCreate}>
            New Definition
          </PrimaryButton>
        ) : null
      }
    >
      {actionError ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{actionError}</div>
      ) : null}
      {definitionsQuery.loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading evaluation definitions...
        </div>
      ) : definitions.length === 0 ? (
        <EmptyState title="No evaluation definitions yet" description="Add the rules that score or validate agent outputs." />
      ) : (
        <DataTable
          rows={definitions}
          getRowKey={(definition) => definition.id}
          columns={[
            {
              key: 'name',
              header: 'Definition',
              render: (definition) => (
                <div>
                  <p className="font-medium text-slate-900">{definition.name ?? `Definition ${definition.id}`}</p>
                  <p className="text-xs text-slate-500">{definition.scope}</p>
                </div>
              ),
            },
            { key: 'type', header: 'Type', render: (definition) => definition.type },
            {
              key: 'parameters',
              header: 'Parameters',
              render: (definition) => (
                <pre className="max-w-sm overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                  {stringifyJson(definition.parameters ?? {})}
                </pre>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (definition) => (
                <div className="flex gap-2">
                  {canWrite ? (
                    <PrimaryButton type="button" onClick={() => openEdit(definition)} className="px-3 py-2 text-xs">
                      Edit
                    </PrimaryButton>
                  ) : null}
                  {canDelete ? (
                    <SecondaryButton type="button" onClick={() => setDeleteTarget(definition)} className="px-3 py-2 text-xs">
                      Delete
                    </SecondaryButton>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={isOpen}
        title={editing ? `Edit ${editing.name ?? `Definition ${editing.id}`}` : 'Create evaluation definition'}
        onClose={() => setIsOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Scope">
              <Select value={scope} onChange={(event) => setScope(event.target.value as EvaluationScope)}>
                <option value="WORKSPACE">WORKSPACE</option>
                <option value="AGENT">AGENT</option>
              </Select>
            </Field>
            <Field label="Type">
              <Select value={type} onChange={(event) => setType(event.target.value as (typeof evaluatorTypes)[number])}>
                {evaluatorTypes.map((evaluatorType) => (
                  <option key={evaluatorType} value={evaluatorType}>
                    {evaluatorType}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Agent">
              <Select value={agentId} onChange={(event) => setAgentId(event.target.value)} disabled={scope !== 'AGENT'}>
                <option value="">Workspace-level definition</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Parameters JSON">
            <Textarea rows={8} value={parametersJson} onChange={(event) => setParametersJson(event.target.value)} />
          </Field>
          <Field label="Definition JSON">
            <Textarea rows={8} value={definitionJson} onChange={(event) => setDefinitionJson(event.target.value)} />
          </Field>
          <div className="flex justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit">{editing ? 'Save changes' : 'Create definition'}</PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete definition"
        message={`Delete "${deleteTarget?.name ?? ''}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Delete definition"
      />
    </PageSection>
  )
}
