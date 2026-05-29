import {
  getSymptomOrder,
  symptomDefinitions,
} from '../config/symptoms'
import type { LabSession, SymptomEntry, SymptomKey, SymptomSeverity } from '../types/session'

export interface SessionSymptomHistoryRow {
  symptomKey: SymptomKey
  label: string
  description: string
  severity: SymptomSeverity | null
  note: string | null
  loggedAt: string | null
}

export interface SessionSymptomHistory {
  session: LabSession
  rows: SessionSymptomHistoryRow[]
}

function sortSessionsNewestFirst(sessions: LabSession[]) {
  return [...sessions].sort(
    (left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp),
  )
}

function latestSymptomEntry(
  symptoms: SymptomEntry[],
  sessionId: string,
  symptomKey: SymptomKey,
) {
  return symptoms
    .filter((symptom) => symptom.sessionId === sessionId && symptom.symptomKey === symptomKey)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))[0] ?? null
}

export function buildSessionSymptomHistory(
  sessions: LabSession[],
  symptoms: SymptomEntry[],
): SessionSymptomHistory[] {
  return sortSessionsNewestFirst(sessions).map((session) => ({
    session,
    rows: symptomDefinitions
      .map((definition) => {
        const entry = latestSymptomEntry(symptoms, session.sessionId, definition.key)

        return {
          symptomKey: definition.key,
          label: definition.label,
          description: definition.description,
          severity: entry?.severity ?? null,
          note: entry?.note ?? null,
          loggedAt: entry?.timestamp ?? null,
        }
      })
      .sort((left, right) => getSymptomOrder(left.symptomKey) - getSymptomOrder(right.symptomKey)),
  }))
}
