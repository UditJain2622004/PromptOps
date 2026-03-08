import { listAgents, listAgentVersions } from '@/api/agents'
import { executeAgent } from '@/api/gateway'
import { Field, PrimaryButton, Select, Textarea } from '@/components/FormControls'
import { PageSection } from '@/components/PageSection'
import { useApi } from '@/hooks/useApi'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

export function PlaygroundPage() {
  const params = useParams()
  const workspaceId = Number.parseInt(params.workspaceId ?? '', 10)
  const agentsQuery = useApi(() => listAgents(workspaceId), [workspaceId])
  const [agentId, setAgentId] = useState('')
  const versionsQuery = useApi(
    () => (agentId ? listAgentVersions(workspaceId, Number.parseInt(agentId, 10)) : Promise.resolve({ versions: [] })),
    [workspaceId, agentId]
  )

  const [agentVersionId, setAgentVersionId] = useState('')
  const [message, setMessage] = useState('Hello. Please introduce yourself in one sentence.')
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const agents = useMemo(() => agentsQuery.data?.agents ?? [], [agentsQuery.data])
  const versions = useMemo(() => versionsQuery.data?.versions ?? [], [versionsQuery.data])

  useEffect(() => {
    if (!agentId && agents.length > 0) {
      setAgentId(String(agents[0].id))
    }
  }, [agentId, agents])

  useEffect(() => {
    if (versions.length > 0) {
      setAgentVersionId(String(versions[0].id))
    } else {
      setAgentVersionId('')
    }
  }, [versions])

  async function handleExecute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setResponse(null)
    try {
      const result = await executeAgent(workspaceId, Number.parseInt(agentId, 10), {
        versionId: agentVersionId ? Number.parseInt(agentVersionId, 10) : undefined,
        messages: [{ role: 'user', content: message }],
      })
      setResponse(result.output)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageSection title="Gateway Playground" description="Run a message through the PromptOps gateway using a selected agent version.">
        <form
          onSubmit={handleExecute}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
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
            <Field label="Agent Version">
              <Select value={agentVersionId} onChange={(event) => setAgentVersionId(event.target.value)}>
                <option value="">Use active version</option>
                {versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    Version {version.id}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="User message">
            <Textarea rows={8} value={message} onChange={(event) => setMessage(event.target.value)} required />
          </Field>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex justify-end">
            <PrimaryButton type="submit" disabled={submitting || !agentId}>
              {submitting ? 'Executing...' : 'Run through gateway'}
            </PrimaryButton>
          </div>
        </form>
      </PageSection>

      <PageSection title="Response" description="The normalized agent output from the gateway response.">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {response ? (
            <pre className="whitespace-pre-wrap text-sm text-slate-800">{response}</pre>
          ) : (
            <p className="text-sm text-slate-500">Run the playground to see a response here.</p>
          )}
        </div>
      </PageSection>
    </div>
  )
}
