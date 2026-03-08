/* eslint-disable react-refresh/only-export-components */
import {
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  storeSession,
} from '@/api/client'
import { login as loginRequest, register as registerRequest } from '@/api/auth'
import type { User } from '@/types/api'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (input: { email: string; password: string }) => Promise<void>
  register: (input: { name: string; email: string; password: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser<User>())
  const [token, setToken] = useState<string | null>(() => getStoredToken())

  useEffect(() => {
    const handleExpired = () => {
      setUser(null)
      setToken(null)
      clearStoredSession()
    }

    window.addEventListener('promptops:auth-expired', handleExpired)
    return () => {
      window.removeEventListener('promptops:auth-expired', handleExpired)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      async login(input) {
        const response = await loginRequest(input)
        storeSession(response.token, response.user)
        setUser(response.user)
        setToken(response.token)
      },
      async register(input) {
        const response = await registerRequest(input)
        storeSession(response.token, response.user)
        setUser(response.user)
        setToken(response.token)
      },
      logout() {
        clearStoredSession()
        setUser(null)
        setToken(null)
      },
    }),
    [token, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
