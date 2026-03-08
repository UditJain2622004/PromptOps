/* eslint-disable react-refresh/only-export-components */
import { listWorkspaces } from '@/api/workspaces'
import { useAuth } from '@/context/AuthContext'
import type { Workspace } from '@/types/api'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface WorkspaceContextValue {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  loading: boolean
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function WorkspaceProvider({
  workspaceId,
  children,
}: {
  workspaceId: number
  children: ReactNode
}) {
  const { isAuthenticated } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)

  const refreshWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await listWorkspaces()
      setWorkspaces(response.workspaces)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void refreshWorkspaces()
  }, [refreshWorkspaces])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      currentWorkspace: workspaces.find((workspace) => workspace.id === workspaceId) ?? null,
      loading,
      refreshWorkspaces,
    }),
    [loading, refreshWorkspaces, workspaceId, workspaces]
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}
