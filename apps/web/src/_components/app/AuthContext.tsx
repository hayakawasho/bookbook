import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

export type AuthMode = 'http' | 'mock'

export type CurrentUser = {
  email: string
  name?: string
  picture?: string
}

type AuthContextValue = {
  currentUser: CurrentUser | null
  authLoading: boolean
  login: () => void
  logout: () => void | Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  mode: AuthMode
  apiBase: string
  children: ReactNode
}

export function AuthProvider({ mode, apiBase, children }: AuthProviderProps) {
  const useHttp = mode === 'http'
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() =>
    useHttp ? null : { email: 'mock@local.dev', name: 'Mock' },
  )
  const [authLoading, setAuthLoading] = useState(() => useHttp)

  useEffect(() => {
    if (!useHttp) {
      return
    }

    let cancelled = false
    ;(async () => {
      setAuthLoading(true)
      try {
        const res = await fetch(`${apiBase}/auth/me`, { credentials: 'include' })
        if (cancelled) {
          return
        }

        if (res.ok) {
          const data = (await res.json()) as {
            user: { email: string; name: string | null; picture?: string | null }
          }
          setCurrentUser({
            email: data.user.email,
            name: data.user.name ?? undefined,
            picture: data.user.picture ?? undefined,
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
  }, [useHttp, apiBase])

  const login = () => {
    window.location.href = `${apiBase}/auth/google/start`
  }

  const logout = async () => {
    if (!useHttp) {
      return
    }

    try {
      await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' })
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
