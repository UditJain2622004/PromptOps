import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { WorkspaceProvider } from '@/context/WorkspaceContext'
import { Navigate, Outlet, useParams } from 'react-router-dom'

export function WorkspaceLayout() {
  const params = useParams()
  const workspaceId = Number.parseInt(params.workspaceId ?? '', 10)

  if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
    return <Navigate to="/workspaces" replace />
  }

  return (
    <WorkspaceProvider workspaceId={workspaceId}>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  )
}
