import { createContext, useContext } from 'react'
import type { BackendAPIService, AuthResponse } from '../services/backendApiService'

export interface AuthContextValue {
  api: BackendAPIService
  token: string | null
  user: AuthResponse['user'] | null
  termsAccepted: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  acceptTerms: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
