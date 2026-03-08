import { useWorkspace } from '@/context/WorkspaceContext'
import { NavLink } from 'react-router-dom'

const links = [
  { to: 'agents', label: 'Agents' },
  { to: 'datasets', label: 'Datasets' },
  { to: 'evaluations', label: 'Evaluations' },
  { to: 'evaluations/runs', label: 'Evaluation Runs' },
  { to: 'playground', label: 'Playground' },
  { to: 'settings', label: 'Settings' },
]

export function Sidebar() {
  const { currentWorkspace } = useWorkspace()

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-slate-200">
      <div className="border-b border-slate-800 px-5 py-5">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">PromptOps</p>
        <h1 className="mt-2 text-lg font-semibold">{currentWorkspace?.name ?? 'Workspace'}</h1>
        <p className="mt-1 text-sm text-slate-400">{currentWorkspace?.role ?? 'Loading...'}</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block rounded-xl px-4 py-3 text-sm font-medium ${
                isActive ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-900'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
