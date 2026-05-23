import {
  getSymptomLabel,
  symptomDefinitions,
  symptomSeverityRank,
} from '../config/symptoms'
import type { LabSession, SymptomEntry, SymptomKey, SymptomSeverity } from '../types/session'

export type SymptomTrendLabel =
  | 'increased'
  | 'decreased'
  | 'unchanged'
  | 'newly flagged'
  | 'no prior data'
  | 'no current data'

export interface SymptomTrendSummary {
  symptomKey: SymptomKey
  label: string
  previousSessionId: string | null
  currentSessionId: string | null
  previousSeverity: SymptomSeverity | null
  currentSeverity: SymptomSeverity | null
  trendLabel: SymptomTrendLabel
}

function sortSessionsNewestFirst(sessions: LabSession[]) {
  return [...sessions].sort(
    (left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp),
  )
}

function latestEntryForSession(
  symptoms: SymptomEntry[],
  sessionId: string,
  symptomKey: SymptomKey,
) {
  return [...symptoms]
    .filter((symptom) => symptom.sessionId === sessionId && symptom.symptomKey === symptomKey)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))[0] ?? null
}

function compareSeverities(
  previousSeverity: SymptomSeverity | null,
  currentSeverity: SymptomSeverity | null,
): SymptomTrendLabel {
  if (!currentSeverity) return 'no current data'
  if (!previousSeverity) return 'no prior data'

  const previousRank = symptomSeverityRank[previousSeverity]
  const currentRank = symptomSeverityRank[currentSeverity]

  if (previousRank === 0 && currentRank > 0) return 'newly flagged'
  if (currentRank > previousRank) return 'increased'
  if (currentRank < previousRank) return 'decreased'
  return 'unchanged'
}

export function buildSymptomTrendSummary(
  sessions: LabSession[],
  symptoms: SymptomEntry[],
): SymptomTrendSummary[] {
  const [currentSession, previousSession] = sortSessionsNewestFirst(sessions)

  return symptomDefinitions.map(({ key }) => {
    const currentSeverity = currentSession
      ? latestEntryForSession(symptoms, currentSession.sessionId, key)?.severity ?? null
      : null
    const previousSeverity = previousSession
      ? latestEntryForSession(symptoms, previousSession.sessionId, key)?.severity ?? null
      : null

    return {
      symptomKey: key,
      label: getSymptomLabel(key),
      previousSessionId: previousSession?.sessionId ?? null,
      currentSessionId: currentSession?.sessionId ?? null,
      previousSeverity,
      currentSeverity,
      trendLabel: compareSeverities(previousSeverity, currentSeverity),
    }
  })
}
