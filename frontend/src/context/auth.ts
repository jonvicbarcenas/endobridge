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
  logout: () => Promise<void>
  /** One-time recovery code to show after registration, until the user dismisses it. */
  recoveryCode: string | null
  dismissRecoveryCode: () => void
  /** Resets a forgotten password and returns the replacement recovery code. */
  recoverPassword: (email: string, recoveryCode: string, newPassword: string) => Promise<string>
  /** Issues a new recovery code for the signed-in user (the old one stops working). */
  regenerateRecoveryCode: () => Promise<string>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
