import { createContext, useContext, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'

export type Role = 'STUDENT' | 'TUTOR' | 'COMPANY' | 'COORDINATOR'

export interface AuthUser {
  id: number
  email: string
  fullName: string
  role: Role
}

interface LoginResponse {
  accessToken: string
  user: AuthUser
}

interface AuthContextValue {
  user: AuthUser | null
  role: Role | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const navigate = useNavigate()

  async function login(email: string, password: string) {
    const { accessToken, user: loggedUser } = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('user', JSON.stringify(loggedUser))
    setUser(loggedUser)
  }

  function logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
