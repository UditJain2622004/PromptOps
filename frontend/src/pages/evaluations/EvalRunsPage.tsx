import { listAgents, listAgentVersions } from '@/api/agents'
import { listDatasets } from '@/api/datasets'
import {
  createEvaluationRun,
  listEvaluationDefinitions,
  listEvaluationRuns,
} from '@/api/evaluations'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import {
  Field,
  Input,
  PrimaryButton,
  Select,
} from '@/components/FormControls'
import { PageSection } from '@/components/PageSection'
import { StatusBadge } from '@/components/StatusBadge'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useApi } from '@/hooks/useApi'
import type { EvaluationRun } from '@/types/api'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

export function EvalRunsPage() {
  const params = useParams()
  const navigate = useNavigate()
  const workspaceId = Number.parseInt(params.workspaceId ?? '', 10)
  const { currentWorkspace } = useWorkspace()
  const runsQuery = useApi(() => listEvaluationRuns(workspaceId), [workspaceId])
  const agentsQuery = useApi(() => listAgentsAndVersions(workspaceId), [workspaceId])
  const datasetsQuery = useApi(() => listDatasets(workspaceId), [workspaceId])
  const definitionsQuery = useApi(() => listEvaluationDefinitions(workspaceId), [workspaceId])

  const [name, setName] = useState('')
  const [selectedVersionIds, setSelectedVersionIds] = useState<number[]>([])
  const [datasetId, setDatasetId] = useState('')
  const [selectedDefinitionIds, setSelectedDefinitionIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const canWrite = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN'
  const runs = useMemo(() => runsQuery.data?.runs ?? [], [runsQuery.data])
  const agentVersions = useMemo(() => agentsQuery.data ?? [], [agentsQuery.data])
  const datasets = useMemo(() => datasetsQuery.data?.datasets ?? [], [datasetsQuery.data])
  const definitions = useMemo(() => definitionsQuery.data?.definitions ?? [], [definitionsQuery.data])

  async function handleCreateRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setActionError(null)
    try {
      const { run } = await createEvaluationRun(workspaceId, {
        name: name || undefined,
        configSnapshot: {
          agentVersionIds: selectedVersionIds,
          datasetId: Number.parseInt(datasetId, 10),
          evaluationDefinitionIds: selectedDefinitionIds,
        },
      })
      setName('')
      setSelectedVersionIds([])
      setDatasetId('')
      setSelectedDefinitionIds([])
      await runsQuery.refetch()
      navigate(`/workspaces/${workspaceId}/evaluations/runs/${run.id}`)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create evaluation run')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleNumber(value: number, current: number[], setter: (next: number[]) => void) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  return (
    <div className="space-y-8">
      <PageSection title="Evaluation Runs" description="Create offline evaluation runs and inspect their current status.">
        <form
          onSubmit={handleCreateRun}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <Field label="Run name">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Capital city baseline" />
          </Field>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Agent Versions</h3>
              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                {agentVersions.map((version) => (
                  <label key={version.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedVersionIds.includes(version.id)}
                      onChange={() =>
                        toggleNumber(version.id, selectedVersionIds, setSelectedVersionIds)
                      }
                      disabled={!canWrite}
                    />
                    <span>
                      <span className="font-medium">{version.agentName}</span>
                      <span className="block text-xs text-slate-500">Version {version.id}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Dataset</h3>
              <Field label="Select dataset">
                <Select value={datasetId} onChange={(event) => setDatasetId(event.target.value)} disabled={!canWrite}>
                  <option value="">Choose dataset</option>
                  {datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name ?? `Dataset ${dataset.id}`}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Evaluators</h3>
              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                {definitions.map((definition) => (
                  <label key={definition.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedDefinitionIds.includes(definition.id)}
                      onChange={() =>
                        toggleNumber(definition.id, selectedDefinitionIds, setSelectedDefinitionIds)
                      }
                      disabled={!canWrite}
                    />
                    <span>
                      <span className="font-medium">{definition.name ?? `Definition ${definition.id}`}</span>
                      <span className="block text-xs text-slate-500">{definition.type}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
          <div className="flex justify-end">
            <PrimaryButton
              type="submit"
              disabled={
                !canWrite ||
                submitting ||
                !datasetId ||
                selectedVersionIds.length === 0 ||
                selectedDefinitionIds.length === 0
              }
            >
              {submitting ? 'Creating run...' : 'Create run'}
            </PrimaryButton>
          </div>
        </form>
      </PageSection>

      <PageSection title="Existing runs" description="Open a run to view summary stats and per-version results.">
        {runsQuery.loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Loading evaluation runs...
          </div>
        ) : runs.length === 0 ? (
          <EmptyState title="No runs yet" description="Create a run above to evaluate agent versions against a dataset." />
        ) : (
          <DataTable
            rows={runs}
            getRowKey={(run) => run.id}
            columns={[
              {
                key: 'name',
                header: 'Run',
                render: (run: EvaluationRun) => (
                  <div>
                    <p className="font-medium text-slate-900">{run.name ?? `Run ${run.id}`}</p>
                    <p className="text-xs text-slate-500">ID {run.id}</p>
                  </div>
                ),
              },
              { key: 'status', header: 'Status', render: (run) => <StatusBadge value={run.status} /> },
              {
                key: 'createdAt',
                header: 'Created',
                render: (run) => new Date(run.createdAt).toLocaleString(),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (run) => (
                  <Link
                    to={`/workspaces/${workspaceId}/evaluations/runs/${run.id}`}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                  >
                    View report
                  </Link>
                ),
              },
            ]}
          />
        )}
      </PageSection>
    </div>
  )
}

async function listAgentsAndVersions(workspaceId: number) {
  const agentsResponse = await listAgents(workspaceId)
  const results = await Promise.all(
    agentsResponse.agents.map(async (agent) => {
      const versionsResponse = await listAgentVersions(workspaceId, agent.id)
      return versionsResponse.versions.map((version) => ({
        ...version,
        agentName: agent.name,
      }))
    })
  )

  return results.flat()
}
