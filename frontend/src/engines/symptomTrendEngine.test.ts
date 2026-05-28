import { describe, expect, it } from 'vitest'
import { buildSymptomTrendSummary } from './symptomTrendEngine'
import type { LabSession, SymptomEntry } from '../types/session'

function session(sessionId: string, timestamp: string): LabSession {
  return {
    sessionId,
    timestamp,
    status: 'complete',
    biomarkers: {},
    supplementary: {
      age: 28,
      cycleRegularity: 'irregular',
    },
    questionnaire: null,
    insightReport: null,
  }
}

function symptom({
  entryId,
  sessionId,
  symptomKey,
  severity,
  timestamp,
}: Pick<SymptomEntry, 'entryId' | 'sessionId' | 'symptomKey' | 'severity' | 'timestamp'>): SymptomEntry {
  return {
    entryId,
    sessionId,
    symptomKey,
    severity,
    note: null,
    timestamp,
  }
}

describe('buildSymptomTrendSummary', () => {
  it('summarizes the most recent two session symptom statuses for Gemini payload context', () => {
    const sessions = [
      session('older-session', '2026-05-20T00:00:00.000Z'),
      session('previous-session', '2026-05-21T00:00:00.000Z'),
      session('current-session', '2026-05-22T00:00:00.000Z'),
    ]
    const symptoms: SymptomEntry[] = [
      symptom({
        entryId: 'older-acne',
        sessionId: 'older-session',
        symptomKey: 'acne',
        severity: 'severe',
        timestamp: '2026-05-20T00:00:00.000Z',
      }),
      symptom({
        entryId: 'previous-acne',
        sessionId: 'previous-session',
        symptomKey: 'acne',
        severity: 'mild',
        timestamp: '2026-05-21T00:00:00.000Z',
      }),
      symptom({
        entryId: 'current-acne',
        sessionId: 'current-session',
        symptomKey: 'acne',
        severity: 'severe',
        timestamp: '2026-05-22T00:00:00.000Z',
      }),
      symptom({
        entryId: 'previous-fatigue',
        sessionId: 'previous-session',
        symptomKey: 'fatigue',
        severity: 'moderate',
        timestamp: '2026-05-21T00:00:00.000Z',
      }),
      symptom({
        entryId: 'current-fatigue',
        sessionId: 'current-session',
        symptomKey: 'fatigue',
        severity: 'none',
        timestamp: '2026-05-22T00:00:00.000Z',
      }),
      symptom({
        entryId: 'current-cycle',
        sessionId: 'current-session',
        symptomKey: 'cycleIrregularity',
        severity: 'moderate',
        timestamp: '2026-05-22T00:00:00.000Z',
      }),
    ]

    expect(buildSymptomTrendSummary(sessions, symptoms)).toMatchObject([
      {
        symptomKey: 'cycleIrregularity',
        previousSeverity: null,
        currentSeverity: 'moderate',
        trendLabel: 'no prior data',
      },
      {
        symptomKey: 'acne',
        previousSeverity: 'mild',
        currentSeverity: 'severe',
        trendLabel: 'increased',
      },
      {
        symptomKey: 'hirsutism',
        previousSeverity: null,
        currentSeverity: null,
        trendLabel: 'no current data',
      },
      {
        symptomKey: 'fatigue',
        previousSeverity: 'moderate',
        currentSeverity: 'none',
        trendLabel: 'decreased',
      },
      {
        symptomKey: 'weightChange',
        previousSeverity: null,
        currentSeverity: null,
        trendLabel: 'no current data',
      },
    ])
  })
})
