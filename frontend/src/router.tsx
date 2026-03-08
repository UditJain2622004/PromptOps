import { WorkspaceLayout } from '@/layouts/WorkspaceLayout'
import { AgentDetailPage } from '@/pages/agents/AgentDetailPage'
import { AgentsPage } from '@/pages/agents/AgentsPage'
import { DatasetDetailPage } from '@/pages/datasets/DatasetDetailPage'
import { DatasetsPage } from '@/pages/datasets/DatasetsPage'
import { EvalDefinitionsPage } from '@/pages/evaluations/EvalDefinitionsPage'
import { EvalRunDetailPage } from '@/pages/evaluations/EvalRunDetailPage'
import { EvalRunsPage } from '@/pages/evaluations/EvalRunsPage'
import { LoginPage } from '@/pages/LoginPage'
import { PlaygroundPage } from '@/pages/PlaygroundPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { WorkspaceListPage } from '@/pages/WorkspaceListPage'
import { useAuth } from '@/context/AuthContext'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from 'react-router-dom'

function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/workspaces" replace /> : <Outlet />
}

const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <Navigate to="/workspaces" replace /> },
      { path: '/workspaces', element: <WorkspaceListPage /> },
      {
        path: '/workspaces/:workspaceId',
        element: <WorkspaceLayout />,
        children: [
          { index: true, element: <Navigate to="agents" replace /> },
          { path: 'agents', element: <AgentsPage /> },
          { path: 'agents/:agentId', element: <AgentDetailPage /> },
          { path: 'datasets', element: <DatasetsPage /> },
          { path: 'datasets/:datasetId', element: <DatasetDetailPage /> },
          { path: 'evaluations', element: <EvalDefinitionsPage /> },
          { path: 'evaluations/runs', element: <EvalRunsPage /> },
          { path: 'evaluations/runs/:runId', element: <EvalRunDetailPage /> },
          { path: 'playground', element: <PlaygroundPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
