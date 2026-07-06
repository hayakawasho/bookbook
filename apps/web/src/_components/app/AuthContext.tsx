import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

const USE_HTTP_API = import.meta.env.VITE_USE_HTTP_API === 'true'
const API_BASE = '/api'

export type CurrentUser = {
  email: string
  name?: string
}

type AuthContextValue = {
  currentUser: CurrentUser | null
  authLoading: boolean
  login: () => void
  logout: () => void | Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() =>
    USE_HTTP_API ? null : { email: 'mock@local.dev', name: 'Mock' },
  )
  const [authLoading, setAuthLoading] = useState(() => USE_HTTP_API)

  useEffect(() => {
    if (!USE_HTTP_API) {
      return
    }
    let cancelled = false
    ;(async () => {
      setAuthLoading(true)
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
        if (cancelled) return
        if (res.ok) {
          const data = (await res.json()) as {
            user: { email: string; name: string | null }
          }
          setCurrentUser({
            email: data.user.email,
            name: data.user.name ?? undefined,
          })
        } else {
          setCurrentUser(null)
        }
      } catch {
        if (!cancelled) setCurrentUser(null)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = () => {
    window.location.href = '/api/auth/google/start'
  }

  const logout = async () => {
    if (!USE_HTTP_API) return
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
    } catch {
      /* network errors: still clear local session UX */
    }
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ currentUser, authLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
