import { describe, expect, it } from 'vitest'
import { buildSessionSymptomHistory } from './symptomHistoryEngine'
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

describe('buildSessionSymptomHistory', () => {
  it('returns every tracked symptom category for a session, including missing entries', () => {
    const symptoms: SymptomEntry[] = [
      {
        entryId: 'acne-entry',
        sessionId: 'session-1',
        symptomKey: 'acne',
        severity: 'moderate',
        note: 'Jawline flare-up',
        timestamp: '2026-05-29T07:00:00.000Z',
      },
    ]

    const [history] = buildSessionSymptomHistory(
      [session('session-1', '2026-05-29T08:00:00.000Z')],
      symptoms,
    )

    expect(history.rows).toHaveLength(5)
    expect(history.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symptomKey: 'acne',
          label: 'Acne',
          severity: 'moderate',
          note: 'Jawline flare-up',
          loggedAt: '2026-05-29T07:00:00.000Z',
        }),
        expect.objectContaining({
          symptomKey: 'fatigue',
          severity: null,
          note: null,
          loggedAt: null,
        }),
      ]),
    )
  })
})
