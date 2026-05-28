import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { BackendAPIService, type AuthResponse } from '../services/backendApiService'
import { AuthContext } from './auth'

const AUTH_TOKEN_KEY = 'endobridge.sessionToken'

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => new BackendAPIService(), [])
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(AUTH_TOKEN_KEY))
  const [user, setUser] = useState<AuthResponse['user'] | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(Boolean(token))

  const persistSession = useCallback((response: AuthResponse) => {
    sessionStorage.setItem(AUTH_TOKEN_KEY, response.token)
    setToken(response.token)
    setUser(response.user)
    setTermsAccepted(response.termsAccepted)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
    setToken(null)
    setUser(null)
    setTermsAccepted(false)
  }, [])

  useEffect(() => {
    if (!token) {
      return
    }

    let isMounted = true
    api
      .profile(token)
      .then((profile) => {
        if (!isMounted) return
        setUser(profile.user)
        setTermsAccepted(profile.termsAccepted)
      })
      .catch(() => {
        if (isMounted) logout()
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [api, logout, token])

  const login = useCallback(async (email: string, password: string) => {
    persistSession(await api.login(email, password))
  }, [api, persistSession])

  const register = useCallback(async (email: string, password: string) => {
    await api.register(email, password)
    persistSession(await api.login(email, password))
  }, [api, persistSession])

  const acceptTerms = useCallback(async () => {
    if (!token) return
    await api.acceptTerms(token)
    setTermsAccepted(true)
  }, [api, token])

  const value = useMemo(
    () => ({
      api,
      token,
      user,
      termsAccepted,
      isLoading,
      login,
      register,
      acceptTerms,
      logout,
    }),
    [acceptTerms, api, isLoading, login, logout, register, termsAccepted, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
