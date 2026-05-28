import { useMemo, useState, type ReactNode } from 'react'
import {
  SessionDraftContext,
  type SessionDraft,
  type SessionDraftContextValue,
} from './sessionDraft'

export function SessionDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<SessionDraft | null>(null)

  const value = useMemo<SessionDraftContextValue>(
    () => ({
      draft,
      setDraft: setDraftState,
      clearDraft: () => setDraftState(null),
    }),
    [draft],
  )

  return <SessionDraftContext.Provider value={value}>{children}</SessionDraftContext.Provider>
}
