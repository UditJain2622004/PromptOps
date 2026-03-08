import { createWorkspace, deleteWorkspace, listWorkspaces } from '@/api/workspaces'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Field, Input, PrimaryButton, SecondaryButton } from '@/components/FormControls'
import { PageSection } from '@/components/PageSection'
import { StatusBadge } from '@/components/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import type { Workspace } from '@/types/api'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export function WorkspaceListPage() {
  const { user, logout } = useAuth()
  const { data, loading, error, refetch } = useApi(() => listWorkspaces(), [])
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const workspaces = useMemo(() => data?.workspaces ?? [], [data])

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setActionError(null)
    try {
      await createWorkspace(name)
      setName('')
      await refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setActionError(null)
    try {
      await deleteWorkspace(deleteTarget.id)
      setDeleteTarget(null)
      await refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete workspace')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">PromptOps</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Workspaces</h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as {user?.name} ({user?.email})
            </p>
          </div>
          <SecondaryButton onClick={logout}>Logout</SecondaryButton>
        </div>

        <PageSection
          title="Create workspace"
          description="Every workspace is an isolated boundary for agents, datasets, evaluations, and members."
        >
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="min-w-0 flex-1">
                <Field label="Workspace name">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Customer Support Demo"
                    required
                  />
                </Field>
              </div>
              <PrimaryButton type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create workspace'}
              </PrimaryButton>
            </div>
            {actionError ? <p className="mt-3 text-sm text-rose-600">{actionError}</p> : null}
          </form>
        </PageSection>

        <PageSection
          title="Your workspaces"
          description="Pick a workspace to manage agents, data, evaluations, gateway execution, and API keys."
        >
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Loading workspaces...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              {error}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-sm text-slate-600">
              No workspaces yet. Create one above to get started.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{workspace.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">Workspace ID {workspace.id}</p>
                    </div>
                    <StatusBadge value={workspace.role} />
                  </div>
                  <p className="mt-4 text-sm text-slate-600">
                    Updated {new Date(workspace.updatedAt).toLocaleString()}
                  </p>
                  <div className="mt-5 flex gap-3">
                    <Link
                      to={`/workspaces/${workspace.id}`}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                    >
                      Open
                    </Link>
                    {workspace.role === 'OWNER' ? (
                      <SecondaryButton onClick={() => setDeleteTarget(workspace)}>Delete</SecondaryButton>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageSection>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete workspace"
        message={`Delete "${deleteTarget?.name ?? ''}"? This removes all nested records.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Delete workspace"
      />
    </div>
  )
}
