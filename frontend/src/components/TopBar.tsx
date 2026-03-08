import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Link, useLocation } from 'react-router-dom'

function formatTitle(pathname: string) {
  const part = pathname.split('/').filter(Boolean).at(-1) ?? 'overview'
  return part
    .split('-')
    .map((value) => value.charAt(0).toUpperCase() + value.slice(1))
    .join(' ')
}

export function TopBar() {
  const { logout, user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const location = useLocation()

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {currentWorkspace?.name ?? 'Workspace'}
        </p>
        <h2 className="text-lg font-semibold text-slate-900">{formatTitle(location.pathname)}</h2>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/workspaces"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Switch Workspace
        </Link>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
