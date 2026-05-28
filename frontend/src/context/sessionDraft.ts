import { createContext, useContext } from 'react'
import type { LabSessionInput, ValidationResult } from '../types/session'

export interface SessionDraft {
  input: LabSessionInput
  validation: ValidationResult
}

export interface SessionDraftContextValue {
  draft: SessionDraft | null
  setDraft: (draft: SessionDraft) => void
  clearDraft: () => void
}

export const SessionDraftContext = createContext<SessionDraftContextValue | null>(null)

export function useSessionDraft() {
  const context = useContext(SessionDraftContext)

  if (!context) {
    throw new Error('useSessionDraft must be used within SessionDraftProvider')
  }

  return context
}
