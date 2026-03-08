import {
  getEvaluationRunResults,
  getEvaluationRunSummary,
} from '@/api/evaluations'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageSection } from '@/components/PageSection'
import { StatusBadge } from '@/components/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { stringifyJson } from '@/utils/json'
import { useParams } from 'react-router-dom'

export function EvalRunDetailPage() {
  const params = useParams()
  const workspaceId = Number.parseInt(params.workspaceId ?? '', 10)
  const runId = Number.parseInt(params.runId ?? '', 10)
  const summaryQuery = useApi(() => getEvaluationRunSummary(workspaceId, runId), [workspaceId, runId])
  const resultsQuery = useApi(() => getEvaluationRunResults(workspaceId, runId), [workspaceId, runId])

  if (summaryQuery.loading || resultsQuery.loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading evaluation report...
      </div>
    )
  }

  if (summaryQuery.error) {
    return <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{summaryQuery.error}</div>
  }

  if (!summaryQuery.data || !resultsQuery.data) {
    return <EmptyState title="Run not found" description="This evaluation run could not be loaded." />
  }

  const { run, summary } = summaryQuery.data
  const results = resultsQuery.data.results

  return (
    <div className="space-y-8">
      <PageSection title={run.name ?? `Run ${run.id}`} description="Summary metrics and detailed evaluator outcomes for this run.">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Status" value={<StatusBadge value={run.status} />} />
          <StatCard label="Total results" value={summary.totalResults} />
          <StatCard label="Passed" value={summary.passed} />
          <StatCard label="Pass rate" value={`${Math.round(summary.passRate * 100)}%`} />
        </div>
      </PageSection>

      <PageSection title="Results" description="Every row represents one evaluator result for one agent version.">
        {results.length === 0 ? (
          <EmptyState title="No results stored" description="This run has not produced result rows yet." />
        ) : (
          <DataTable
            rows={results}
            getRowKey={(result) => result.id}
            columns={[
              { key: 'agentVersionId', header: 'Agent Version', render: (result) => result.agentVersionId },
              {
                key: 'definition',
                header: 'Evaluator',
                render: (result) => (
                  <div>
                    <p className="font-medium text-slate-900">
                      {result.evaluationDefinition.name ?? `Definition ${result.evaluationDefinition.id}`}
                    </p>
                    <p className="text-xs text-slate-500">{result.evaluationDefinition.type}</p>
                  </div>
                ),
              },
              {
                key: 'passed',
                header: 'Outcome',
                render: (result) => <StatusBadge value={result.passed ? 'PASSED' : 'FAILED'} />,
              },
              {
                key: 'details',
                header: 'Details',
                render: (result) => (
                  <pre className="max-w-xl overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                    {stringifyJson(result.details)}
                  </pre>
                ),
              },
            ]}
          />
        )}
      </PageSection>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}
