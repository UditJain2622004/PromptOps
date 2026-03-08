// import {
//   getEvaluationRunResults,
//   getEvaluationRunSummary,
// } from '@/api/evaluations'
// import { EmptyState } from '@/components/EmptyState'
// import { PageSection } from '@/components/PageSection'
// import { StatusBadge } from '@/components/StatusBadge'
// import { useApi } from '@/hooks/useApi'
// import type { EvaluationResultItem, EvalVersionStats } from '@/types/api'
// import { stringifyJson } from '@/utils/json'
// import React, { useEffect, useState } from 'react'
// import { useParams } from 'react-router-dom'

// const POLL_INTERVAL_MS = 2000

// function extractDataItemText(data: Record<string, unknown> | null | undefined): string {
//   if (!data || typeof data !== 'object') return ''
//   if (typeof data.input === 'string') return data.input
//   if (typeof data.prompt === 'string') return data.prompt
//   if (typeof data.question === 'string') return data.question
//   if (typeof data.message === 'string') return data.message
//   if (typeof data.text === 'string') return data.text
//   return stringifyJson(data)
// }

// function groupResultsByVersion(results: EvaluationResultItem[]): Map<number, EvaluationResultItem[]> {
//   const map = new Map<number, EvaluationResultItem[]>()
//   for (const r of results) {
//     const list = map.get(r.agentVersionId) ?? []
//     list.push(r)
//     map.set(r.agentVersionId, list)
//   }
//   return map
// }

// export function EvalRunDetailPage() {
//   const params = useParams()
//   const workspaceId = Number.parseInt(params.workspaceId ?? '', 10)
//   const runId = Number.parseInt(params.runId ?? '', 10)
//   const summaryQuery = useApi(() => getEvaluationRunSummary(workspaceId, runId), [workspaceId, runId])
//   const resultsQuery = useApi(() => getEvaluationRunResults(workspaceId, runId), [workspaceId, runId])

//   const runStatus = summaryQuery.data?.run.status
//   const isPending = runStatus === 'CREATED' || runStatus === 'RUNNING'
//   const isComplete = runStatus === 'COMPLETED' || runStatus === 'FAILED'
//   const refetchSummary = summaryQuery.refetch
//   const refetchResults = resultsQuery.refetch

//   useEffect(() => {
//     if (!isPending) return
//     const interval = setInterval(() => {
//       void refetchSummary().catch(() => undefined)
//       void refetchResults().catch(() => undefined)
//     }, POLL_INTERVAL_MS)
//     return () => clearInterval(interval)
//   }, [isPending, refetchSummary, refetchResults])

//   if (summaryQuery.loading || resultsQuery.loading) {
//     return (
//       <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
//         Loading evaluation report...
//       </div>
//     )
//   }

//   if (summaryQuery.error) {
//     return <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{summaryQuery.error}</div>
//   }

//   if (!summaryQuery.data || !resultsQuery.data) {
//     return <EmptyState title="Run not found" description="This evaluation run could not be loaded." />
//   }

//   const { run, perVersion } = summaryQuery.data
//   const results = resultsQuery.data.results
//   const byVersion = groupResultsByVersion(results)

//   return (
//     <div className="space-y-8">
//       <PageSection
//         title={run.name ?? `Run ${run.id}`}
//         description={
//           isPending
//             ? 'Evaluation is running. Results will appear as they complete.'
//             : 'Compare agent versions below. Each version has its own results table.'
//         }
//       >
//         <div className="flex items-center gap-2">
//           <span className="text-sm text-slate-500">Status:</span>
//           <StatusBadge value={run.status} />
//         </div>
//       </PageSection>

//       {isComplete && perVersion.length > 0 && (
//         <PageSection title="Version comparison" description="Pass rate by agent version.">
//           {perVersion.length > 1 && <VersionComparisonChart perVersion={perVersion} />}
//           <div className="mt-4 flex flex-wrap gap-4">
//             {perVersion.map((pv) => (
//               <VersionStatCard key={pv.agentVersionId} stats={pv} />
//             ))}
//           </div>
//         </PageSection>
//       )}

//       <PageSection
//         title="Results by version"
//         description="Expand a row to see data item, evaluator definition, agent response, and details."
//       >
//         {results.length === 0 ? (
//           <EmptyState
//             title="No results yet"
//             description={isPending ? 'Results will appear when the run completes.' : 'This run produced no result rows.'}
//           />
//         ) : (
//           <div className="space-y-10">
//             {Array.from(byVersion.entries())
//               .sort(([a], [b]) => a - b)
//               .map(([versionId, versionResults]) => (
//                 <VersionResultsTable key={versionId} versionId={versionId} results={versionResults} />
//               ))}
//           </div>
//         )}
//       </PageSection>
//     </div>
//   )
// }

// function VersionComparisonChart({
//   perVersion,
// }: {
//   perVersion: { agentVersionId: number; passRate: number }[]
// }) {
//   if (perVersion.length <= 1) return null
//   const maxRate = Math.max(...perVersion.map((p) => p.passRate), 0.01)
//   return (
//     <div className="flex items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
//       {perVersion.map((pv) => (
//         <div key={pv.agentVersionId} className="flex flex-1 flex-col items-center gap-1">
//           <div
//             className="w-full rounded-t bg-emerald-500/80 transition-all"
//             style={{ height: `${Math.max(4, (pv.passRate / maxRate) * 120)}px` }}
//           />
//           <span className="text-xs font-medium text-slate-600">v{pv.agentVersionId}</span>
//           <span className="text-xs text-slate-500">{Math.round(pv.passRate * 100)}%</span>
//         </div>
//       ))}
//     </div>
//   )
// }

// function VersionStatCard({ stats }: { stats: EvalVersionStats }) {
//   return (
//     <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
//       <span className="text-sm font-medium text-slate-700">Version {stats.agentVersionId}</span>
//       <span
//         className={
//           'ml-2 text-lg font-semibold ' +
//           (stats.passRate >= 0.8 ? 'text-emerald-600' : stats.passRate >= 0.5 ? 'text-amber-600' : 'text-rose-600')
//         }
//       >
//         {Math.round(stats.passRate * 100)}%
//       </span>
//       <span className="ml-2 text-sm text-slate-500">({stats.passed}/{stats.total})</span>
//     </div>
//   )
// }

// function VersionResultsTable({
//   versionId,
//   results,
// }: {
//   versionId: number
//   results: EvaluationResultItem[]
// }) {
//   const [expandedId, setExpandedId] = useState<number | null>(null)
//   const passed = results.filter((r) => r.passed).length
//   const total = results.length
//   const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

//   return (
//     <div>
//       <div className="mb-2 flex items-center gap-2">
//         <h3 className="text-base font-semibold text-slate-900">Version {versionId}</h3>
//         <span
//           className={
//             'text-sm font-medium ' +
//             (passRate >= 80 ? 'text-emerald-600' : passRate >= 50 ? 'text-amber-600' : 'text-rose-600')
//           }
//         >
//           {passRate}% ({passed}/{total})
//         </span>
//       </div>
//       <div className="overflow-hidden rounded-xl border border-slate-200">
//         <table className="w-full text-sm">
//           <thead>
//             <tr className="border-b border-slate-200 bg-slate-50">
//               <th className="px-4 py-3 text-left font-medium text-slate-700">Evaluator</th>
//               <th className="px-4 py-3 text-left font-medium text-slate-700">Data Item</th>
//               <th className="px-4 py-3 text-left font-medium text-slate-700">Outcome</th>
//               <th className="w-10 px-2 py-3" />
//             </tr>
//           </thead>
//           <tbody>
//             {results.map((result) => (
//               <React.Fragment key={result.id}>
//                 <tr
//                   className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
//                   onClick={() => setExpandedId((x) => (x === result.id ? null : result.id))}
//                 >
//                   <td className="px-4 py-2">
//                     <div>
//                       <p className="font-medium text-slate-900">
//                         {result.evaluationDefinition.name ?? `Definition ${result.evaluationDefinition.id}`}
//                       </p>
//                       <p className="text-xs text-slate-500">{result.evaluationDefinition.type}</p>
//                     </div>
//                   </td>
//                   <td className="px-4 py-2 text-slate-600">
//                     {result.dataItem ? `#${result.dataItem.id}` : result.dataItemId ? `#${result.dataItemId}` : '—'}
//                   </td>
//                   <td className="px-4 py-2">
//                     <StatusBadge value={result.passed ? 'PASSED' : 'FAILED'} />
//                   </td>
//                   <td className="px-2 py-2 text-slate-400">{expandedId === result.id ? '▼' : '▶'}</td>
//                 </tr>
//                 {expandedId === result.id && (
//                   <tr className="border-b border-slate-200 bg-slate-50/70">
//                     <td colSpan={4} className="px-4 py-4">
//                       <ExpandedDetails result={result} />
//                     </td>
//                   </tr>
//                 )}
//               </React.Fragment>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   )
// }

// function ExpandedDetails({ result }: { result: EvaluationResultItem }) {
//   const dataText = extractDataItemText(result.dataItem?.data)
//   return (
//     <div className="grid gap-4 text-sm md:grid-cols-2">
//       <DetailBlock
//         title="Data item"
//         content={dataText || '(no data)'}
//         className="max-h-40 overflow-y-auto"
//       />
//       <DetailBlock
//         title="Agent response"
//         content={result.outputText ?? '(not stored)'}
//         className="max-h-40 overflow-y-auto"
//       />
//       <DetailBlock
//         title="Evaluator definition"
//         content={stringifyJson({
//           type: result.evaluationDefinition.type,
//           parameters: result.evaluationDefinition.parameters,
//           definition: result.evaluationDefinition.definition,
//         })}
//         className="max-h-40 overflow-y-auto"
//       />
//       <DetailBlock
//         title="Agent version"
//         content={stringifyJson({
//           systemInstruction: result.agentVersion.systemInstruction,
//           config: result.agentVersion.config,
//         })}
//         className="max-h-40 overflow-y-auto"
//       />
//       {result.details && Object.keys(result.details).length > 0 && (
//         <DetailBlock
//           title="Result details"
//           content={stringifyJson(result.details)}
//           className="col-span-full max-h-32 overflow-y-auto"
//         />
//       )}
//     </div>
//   )
// }

// function DetailBlock({
//   title,
//   content,
//   className = '',
// }: {
//   title: string
//   content: string
//   className?: string
// }) {
//   return (
//     <div className={className}>
//       <p className="mb-1 font-medium text-slate-700">{title}</p>
//       <pre className="whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200">
//         {content}
//       </pre>
//     </div>
//   )
// }



import {
  getEvaluationRunResults,
  getEvaluationRunSummary,
} from '@/api/evaluations'
import { EmptyState } from '@/components/EmptyState'
// import { PageSection } from '@/components/PageSection'
import { StatusBadge } from '@/components/StatusBadge'
import { useApi } from '@/hooks/useApi'
import type { EvaluationResultItem, EvalVersionStats } from '@/types/api'
import { stringifyJson } from '@/utils/json'
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'

function extractDataItemText(data: Record<string, unknown> | null | undefined): string {
  if (!data || typeof data !== 'object') return ''
  if (typeof data.input === 'string') return data.input
  if (typeof data.prompt === 'string') return data.prompt
  if (typeof data.question === 'string') return data.question
  if (typeof data.message === 'string') return data.message
  if (typeof data.text === 'string') return data.text
  return stringifyJson(data)
}

function groupResultsByVersion(results: EvaluationResultItem[]): Map<number, EvaluationResultItem[]> {
  const map = new Map<number, EvaluationResultItem[]>()
  for (const r of results) {
    const list = map.get(r.agentVersionId) ?? []
    list.push(r)
    map.set(r.agentVersionId, list)
  }
  return map
}

// ─── Radial pass-rate ring ────────────────────────────────────────────────────
function PassRateRing({
  rate,
  size = 72,
  strokeWidth = 7,
}: {
  rate: number
  size?: number
  strokeWidth?: number
}) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - rate)
  const color = rate >= 0.8 ? '#10b981' : rate >= 0.5 ? '#f59e0b' : '#f43f5e'

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

// ─── Horizontal stacked bar (pass / fail) ─────────────────────────────────────
function PassFailBar({ passed, total }: { passed: number; total: number }) {
  const pct = total > 0 ? (passed / total) * 100 : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Sparkline (mini bar chart per version) ───────────────────────────────────
function MiniBarChart({ perVersion }: { perVersion: { agentVersionId: number; passRate: number }[] }) {
  if (perVersion.length <= 1) return null
  const max = Math.max(...perVersion.map((p) => p.passRate), 0.01)
  const BAR_H = 80

  return (
    <div className="flex items-end gap-2">
      {perVersion.map((pv) => {
        const h = Math.max(6, (pv.passRate / max) * BAR_H)
        const color =
          pv.passRate >= 0.8
            ? 'bg-emerald-500'
            : pv.passRate >= 0.5
            ? 'bg-amber-400'
            : 'bg-rose-400'
        return (
          <div key={pv.agentVersionId} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-500">
              {Math.round(pv.passRate * 100)}%
            </span>
            <div
              className={`w-full rounded-t-md ${color} transition-all duration-700`}
              style={{ height: `${h}px` }}
            />
            <span className="text-[10px] text-slate-400">v{pv.agentVersionId}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Summary metric tile ──────────────────────────────────────────────────────
function MetricTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'amber' | 'rose' | 'slate'
}) {
  const accentClass =
    accent === 'green'
      ? 'text-emerald-600'
      : accent === 'amber'
      ? 'text-amber-600'
      : accent === 'rose'
      ? 'text-rose-500'
      : 'text-slate-700'

  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`text-2xl font-bold leading-tight ${accentClass}`}>{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  )
}

// ─── Version comparison card ──────────────────────────────────────────────────
function VersionComparisonCard({ stats }: { stats: EvalVersionStats }) {
  const rate = stats.passRate
  const labelColor =
    rate >= 0.8 ? 'text-emerald-600' : rate >= 0.5 ? 'text-amber-600' : 'text-rose-500'

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Version {stats.agentVersionId}</span>
        <span className={`text-xs text-slate-400`}>
          {stats.passed}/{stats.total} passed
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center">
          <PassRateRing rate={rate} />
          <span
            className={`absolute text-sm font-bold ${labelColor}`}
            style={{ transform: 'none' }}
          >
            {Math.round(rate * 100)}%
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <PassFailBar passed={stats.passed} total={stats.total} />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span className="text-emerald-600">✓ {stats.passed} pass</span>
            <span className="text-rose-400">✗ {stats.total - stats.passed} fail</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Results table for one version ───────────────────────────────────────────
function VersionResultsTable({
  versionId,
  results,
}: {
  versionId: number
  results: EvaluationResultItem[]
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const passed = results.filter((r) => r.passed).length
  const total = results.length
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
  const rateColor =
    passRate >= 80 ? 'text-emerald-600' : passRate >= 50 ? 'text-amber-600' : 'text-rose-500'

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Table header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-800">Version {versionId}</span>
          <span className={`text-sm font-bold ${rateColor}`}>{passRate}%</span>
        </div>
        <div className="flex items-center gap-3">
          <PassFailBar passed={passed} total={total} />
          <span className="w-20 text-right text-xs text-slate-400">
            {passed}/{total} passed
          </span>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              Evaluator
            </th>
            <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              Data Item
            </th>
            <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              Outcome
            </th>
            <th className="w-10 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {results.map((result, idx) => (
            <React.Fragment key={result.id}>
              <tr
                className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                  expandedId === result.id ? 'bg-slate-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                }`}
                onClick={() => setExpandedId((x) => (x === result.id ? null : result.id))}
              >
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-800">
                    {result.evaluationDefinition.name ?? `Definition ${result.evaluationDefinition.id}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{result.evaluationDefinition.type}</p>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500">
                  {result.dataItem ? `#${result.dataItem.id}` : result.dataItemId ? `#${result.dataItemId}` : '—'}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      result.passed
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${result.passed ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    />
                    {result.passed ? 'Passed' : 'Failed'}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-300">
                  <span
                    className={`block transition-transform duration-200 ${
                      expandedId === result.id ? 'rotate-90' : ''
                    }`}
                  >
                    ▶
                  </span>
                </td>
              </tr>
              {expandedId === result.id && (
                <tr className="border-b border-slate-200">
                  <td colSpan={4} className="bg-slate-50/80 px-5 py-5">
                    <ExpandedDetails result={result} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Expanded row details ─────────────────────────────────────────────────────
function ExpandedDetails({ result }: { result: EvaluationResultItem }) {
  const dataText = extractDataItemText(result.dataItem?.data)
  return (
    <div className="grid gap-3 text-sm md:grid-cols-2">
      <DetailBlock title="Data item" content={dataText || '(no data)'} />
      <DetailBlock title="Agent response" content={result.outputText ?? '(not stored)'} />
      <DetailBlock
        title="Evaluator definition"
        content={stringifyJson({
          type: result.evaluationDefinition.type,
          parameters: result.evaluationDefinition.parameters,
          definition: result.evaluationDefinition.definition,
        })}
      />
      <DetailBlock
        title="Agent version config"
        content={stringifyJson({
          systemInstruction: result.agentVersion.systemInstruction,
          config: result.agentVersion.config,
        })}
      />
      {result.details && Object.keys(result.details).length > 0 && (
        <div className="md:col-span-2">
          <DetailBlock title="Result details" content={stringifyJson(result.details)} />
        </div>
      )}
    </div>
  )
}

function DetailBlock({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white p-3.5 text-xs leading-relaxed text-slate-600 shadow-inner ring-1 ring-slate-200">
        {content}
      </pre>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function EvalRunDetailPage() {
  const params = useParams()
  const workspaceId = Number.parseInt(params.workspaceId ?? '', 10)
  const runId = Number.parseInt(params.runId ?? '', 10)

  const summaryQuery = useApi(() => getEvaluationRunSummary(workspaceId, runId), [workspaceId, runId])
  const resultsQuery = useApi(() => getEvaluationRunResults(workspaceId, runId), [workspaceId, runId])

  if (summaryQuery.loading || resultsQuery.loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        <svg
          className="h-4 w-4 animate-spin text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        Loading evaluation report…
      </div>
    )
  }

  if (summaryQuery.error) {
    return (
      <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
        {summaryQuery.error}
      </div>
    )
  }

  if (!summaryQuery.data || !resultsQuery.data) {
    return <EmptyState title="Run not found" description="This evaluation run could not be loaded." />
  }

  const { run, perVersion } = summaryQuery.data
  const results = resultsQuery.data.results
  const byVersion = groupResultsByVersion(results)

  const totalPassed = results.filter((r) => r.passed).length
  const totalFailed = results.length - totalPassed
  const overallRate = results.length > 0 ? totalPassed / results.length : 0
  const isComplete = run.status === 'COMPLETED' || run.status === 'FAILED'

  const overallAccent: 'green' | 'amber' | 'rose' =
    overallRate >= 0.8 ? 'green' : overallRate >= 0.5 ? 'amber' : 'rose'

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{run.name ?? `Run ${run.id}`}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isComplete
              ? 'Evaluation complete — compare agent versions below.'
              : 'Evaluation is in progress. Reload to refresh results.'}
          </p>
        </div>
        <div className="mt-2 sm:mt-0">
          <StatusBadge value={run.status} />
        </div>
      </div>

      {/* ── Summary metric row ── */}
      {isComplete && results.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricTile
            label="Overall pass rate"
            value={`${Math.round(overallRate * 100)}%`}
            sub={`${totalPassed} of ${results.length} passed`}
            accent={overallAccent}
          />
          <MetricTile label="Total results" value={results.length} sub="across all versions" />
          <MetricTile label="Passed" value={totalPassed} sub="results" accent="green" />
          <MetricTile label="Failed" value={totalFailed} sub="results" accent="rose" />
        </div>
      )}

      {/* ── Version comparison ── */}
      {isComplete && perVersion.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-800">Version comparison</h2>
          <p className="mb-4 text-xs text-slate-400">Pass rate breakdown across all agent versions</p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Version stat cards */}
            {perVersion.map((pv) => (
              <VersionComparisonCard key={pv.agentVersionId} stats={pv} />
            ))}

            {/* Bar chart card — only when >1 version */}
            {perVersion.length > 1 && (
              <div className="flex flex-col justify-end rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Pass rate chart
                </p>
                <MiniBarChart perVersion={perVersion} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Results by version ── */}
      <div>
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Results by version</h2>
        <p className="mb-4 text-xs text-slate-400">
          Click any row to expand data item, evaluator definition, agent response, and details.
        </p>

        {results.length === 0 ? (
          <EmptyState
            title="No results yet"
            description={
              run.status === 'CREATED' || run.status === 'RUNNING'
                ? 'Results will appear when the run completes.'
                : 'This run produced no result rows.'
            }
          />
        ) : (
          <div className="space-y-6">
            {Array.from(byVersion.entries())
              .sort(([a], [b]) => a - b)
              .map(([versionId, versionResults]) => (
                <VersionResultsTable key={versionId} versionId={versionId} results={versionResults} />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}