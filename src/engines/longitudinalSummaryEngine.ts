import { mandatoryBiomarkers, referenceRanges } from '../config/referenceRanges'
import { buildSymptomTrendSummary } from './symptomTrendEngine'
import type { BiomarkerTrendSummary, LongitudinalSummary, TrendLabel } from '../types/insight'
import type { BiomarkerEntry, BiomarkerKey, LabSession, SymptomEntry } from '../types/session'

function timestampOf(session: LabSession) {
  return Date.parse(session.timestamp)
}

function uniqueSessions(currentSession: LabSession, sessions: LabSession[]) {
  const byId = new Map<string, LabSession>()
  for (const session of sessions) {
    byId.set(session.sessionId, session)
  }
  byId.set(currentSession.sessionId, currentSession)

  return [...byId.values()]
}

function previousSessionsFor(currentSession: LabSession, sessions: LabSession[]) {
  const currentTimestamp = timestampOf(currentSession)

  return uniqueSessions(currentSession, sessions)
    .filter(
      (session) =>
        session.sessionId !== currentSession.sessionId && timestampOf(session) < currentTimestamp,
    )
    .sort((left, right) => timestampOf(right) - timestampOf(left))
}

function compareBiomarkerTrend(
  currentEntry: BiomarkerEntry | null,
  previousEntry: BiomarkerEntry | null,
): TrendLabel {
  if (!currentEntry) return 'no current data'
  if (!previousEntry) return 'no prior data'
  if (!previousEntry.isFlagged && currentEntry.isFlagged) return 'newly flagged'
  if (currentEntry.value > previousEntry.value) return 'increased'
  if (currentEntry.value < previousEntry.value) return 'decreased'
  return 'unchanged'
}

function buildBiomarkerTrends(
  currentSession: LabSession,
  previousSession: LabSession | null,
): BiomarkerTrendSummary[] {
  return mandatoryBiomarkers.map((key: BiomarkerKey) => {
    const currentEntry = currentSession.biomarkers[key] ?? null
    const previousEntry = previousSession?.biomarkers[key] ?? null

    return {
      key,
      label: referenceRanges[key].label,
      previousSessionId: previousSession?.sessionId ?? null,
      currentSessionId: currentSession.sessionId,
      previousValue: previousEntry?.value ?? null,
      currentValue: currentEntry?.value ?? null,
      unit: currentEntry?.unit ?? previousEntry?.unit ?? null,
      previousDirection: previousEntry?.direction ?? null,
      currentDirection: currentEntry?.direction ?? null,
      trendLabel: compareBiomarkerTrend(currentEntry, previousEntry),
    }
  })
}

export function buildLongitudinalSummary(
  currentSession: LabSession,
  sessions: LabSession[],
  symptoms: SymptomEntry[],
): LongitudinalSummary {
  const previousSessions = previousSessionsFor(currentSession, sessions)
  const previousSession = previousSessions[0] ?? null
  const symptomSessions = previousSession ? [currentSession, previousSession] : [currentSession]

  return {
    priorSessionCount: previousSessions.length,
    biomarkerTrends: buildBiomarkerTrends(currentSession, previousSession),
    symptomTrends: buildSymptomTrendSummary(symptomSessions, symptoms),
  }
}
