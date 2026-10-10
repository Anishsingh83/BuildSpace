import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, refreshSession, setAccessToken, setSessionExpiredHandler } from '../services/api'
import type { TokenResponse, User } from '../types/auth'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On page load, use the refresh cookie to restore the session.
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null))
    let cancelled = false
    ;(async () => {
      try {
        if (await refreshSession()) {
          const me = await api<User>('/auth/me')
          if (!cancelled) setUser(me)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      setSessionExpiredHandler(null)
    }
  }, [])

  const applySession = useCallback((data: TokenResponse) => {
    setAccessToken(data.access_token)
    setUser(data.user)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      applySession(data)
    },
    [applySession],
  )

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const data = await api<TokenResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      })
      applySession(data)
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      await api<void>('/auth/logout', { method: 'POST' })
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
