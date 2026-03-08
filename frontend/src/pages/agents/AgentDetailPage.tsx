import {
  createAgentVersion,
  getAgent,
  listAgentVersions,
  setActiveAgentVersion,
  updateAgent,
} from '@/api/agents'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import {
  Field,
  Input,
  PrimaryButton,
  SecondaryButton,
  Textarea,
} from '@/components/FormControls'
import { PageSection } from '@/components/PageSection'
import { StatusBadge } from '@/components/StatusBadge'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useApi } from '@/hooks/useApi'
import { parseJsonInput, stringifyJson } from '@/utils/json'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

export function AgentDetailPage() {
  const params = useParams()
  const workspaceId = Number.parseInt(params.workspaceId ?? '', 10)
  const agentId = Number.parseInt(params.agentId ?? '', 10)
  const { currentWorkspace } = useWorkspace()
  const agentQuery = useApi(() => getAgent(workspaceId, agentId), [workspaceId, agentId])
  const versionsQuery = useApi(() => listAgentVersions(workspaceId, agentId), [workspaceId, agentId])

  const [draftName, setDraftName] = useState<string | null>(null)
  const [draftDescription, setDraftDescription] = useState<string | null>(null)
  const [systemInstruction, setSystemInstruction] = useState('')
  const [configJson, setConfigJson] = useState('{\n  "model": "openai/gpt-4o-mini"\n}')
  const [savingMeta, setSavingMeta] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN'
  const activeVersionId = agentQuery.data?.agent.activeAgentVersionId ?? null
  const agent = agentQuery.data?.agent
  const name = draftName ?? agent?.name ?? ''
  const description = draftDescription ?? agent?.description ?? ''

  async function handleUpdateAgent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingMeta(true)
    setActionError(null)
    try {
      await updateAgent(workspaceId, agentId, {
        name,
        description: description || undefined,
      })
      setDraftName(null)
      setDraftDescription(null)
      await agentQuery.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update agent')
    } finally {
      setSavingMeta(false)
    }
  }

  async function handleCreateVersion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreatingVersion(true)
    setActionError(null)
    try {
      const config = parseJsonInput<Record<string, unknown>>(configJson, 'Config')
      await createAgentVersion(workspaceId, agentId, { systemInstruction, config })
      setSystemInstruction('')
      await Promise.all([agentQuery.refetch(), versionsQuery.refetch()])
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create version')
    } finally {
      setCreatingVersion(false)
    }
  }

  async function handleSetActive(versionId: number) {
    setActionError(null)
    try {
      await setActiveAgentVersion(workspaceId, agentId, versionId)
      await Promise.all([agentQuery.refetch(), versionsQuery.refetch()])
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to set active version')
    }
  }

  if (agentQuery.loading || versionsQuery.loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading agent...
      </div>
    )
  }

  if (agentQuery.error) {
    return <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{agentQuery.error}</div>
  }

  if (!agent) {
    return <EmptyState title="Agent not found" description="This agent may have been deleted." />
  }

  const versions = versionsQuery.data?.versions ?? []

  return (
    <div className="space-y-8">
      {actionError ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{actionError}</div>
      ) : null}

      <PageSection
        title={agent.name}
        description="Edit the agent metadata and manage immutable agent versions."
      >
        <form
          onSubmit={handleUpdateAgent}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2"
        >
          <Field label="Agent name">
            <Input value={name} onChange={(event) => setDraftName(event.target.value)} disabled={!canWrite} />
          </Field>
          <Field label="Description">
            <Input
              value={description}
              onChange={(event) => setDraftDescription(event.target.value)}
              disabled={!canWrite}
            />
          </Field>
          <div className="lg:col-span-2 flex justify-end">
            <PrimaryButton type="submit" disabled={!canWrite || savingMeta}>
              {savingMeta ? 'Saving...' : 'Save agent'}
            </PrimaryButton>
          </div>
        </form>
      </PageSection>

      <PageSection title="Versions" description="Each version stores a system instruction and config snapshot.">
        {versions.length === 0 ? (
          <EmptyState title="No versions yet" description="Create the first version below." />
        ) : (
          <DataTable
            rows={versions}
            getRowKey={(version) => version.id}
            columns={[
              { key: 'id', header: 'Version', render: (version) => version.id },
              {
                key: 'systemInstruction',
                header: 'System Instruction',
                render: (version) => (
                  <div className="max-w-xl">
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-700">
                      {version.systemInstruction}
                    </p>
                  </div>
                ),
              },
              {
                key: 'config',
                header: 'Config',
                render: (version) => (
                  <pre className="max-w-sm overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                    {stringifyJson(version.config)}
                  </pre>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (version) =>
                  version.id === activeVersionId ? <StatusBadge value="ACTIVE" /> : 'Inactive',
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (version) =>
                  canWrite ? (
                    <PrimaryButton
                      type="button"
                      onClick={() => handleSetActive(version.id)}
                      disabled={version.id === activeVersionId}
                      className="px-3 py-2 text-xs"
                    >
                      Set active
                    </PrimaryButton>
                  ) : null,
              },
            ]}
          />
        )}
      </PageSection>

      <PageSection title="Create version" description="Version creation is immutable. Configure the next release of this agent.">
        <form
          onSubmit={handleCreateVersion}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <Field label="System instruction">
            <Textarea
              rows={8}
              value={systemInstruction}
              onChange={(event) => setSystemInstruction(event.target.value)}
              disabled={!canWrite}
              required
            />
          </Field>
          <Field label="Config JSON">
            <Textarea
              rows={10}
              value={configJson}
              onChange={(event) => setConfigJson(event.target.value)}
              disabled={!canWrite}
              required
            />
          </Field>
          <div className="flex justify-end">
            <SecondaryButton type="submit" disabled={!canWrite || creatingVersion}>
              {creatingVersion ? 'Creating version...' : 'Create version'}
            </SecondaryButton>
          </div>
        </form>
      </PageSection>
    </div>
  )
}
