import { useMemo, type ReactNode } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'
import { useAuth } from './auth'
import {
  SessionDraftContext,
  type SessionDraft,
  type SessionDraftContextValue,
} from './sessionDraft'

export function SessionDraftProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  // Keep the lab-to-questionnaire hand-off across a refresh of the questionnaire page.
  const [draft, setDraftState, clearDraftState] = usePersistentState<SessionDraft | null>(
    user ? `session.${user.userId}` : null,
    null,
  )

  const value = useMemo<SessionDraftContextValue>(
    () => ({
      draft,
      setDraft: setDraftState,
      clearDraft: clearDraftState,
    }),
    [clearDraftState, draft, setDraftState],
  )

  return <SessionDraftContext.Provider value={value}>{children}</SessionDraftContext.Provider>
}
