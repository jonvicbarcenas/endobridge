import { describe, expect, it } from 'vitest'
import { InsufficientDataError, scoreSession } from './scoringEngine'
import { createLabSession } from '../models/labSession'
import { validateLabSessionInput } from './validationEngine'
import type { LabSessionInput } from '../types/session'

const input: LabSessionInput = {
  age: 31,
  bmi: 29.2,
  cycleRegularity: 'irregular',
  biomarkers: {
    ldlC: { value: 180, unit: 'mg/dL' },
    fastingGlucose: { value: 130, unit: 'mg/dL' },
    fastingInsulin: { value: 22, unit: 'uIU/mL' },
    totalTestosterone: { value: 75, unit: 'ng/dL' },
    amh: { value: 9.1, unit: 'ng/mL' },
    lhFshRatio: { value: 2.9, unit: 'ratio' },
    dheas: { value: 410, unit: 'ug/dL' },
  },
}

describe('scoreSession', () => {
  it('ranks the top three contributors by deviation score', () => {
    const validation = validateLabSessionInput(input)
    const session = createLabSession(input, validation)

    const synthesis = scoreSession(session)

    expect(synthesis.topContributors).toHaveLength(3)
    expect(synthesis.topContributors.map((item) => item.rank)).toEqual([1, 2, 3])
    expect(synthesis.topContributors.map((item) => item.weight)).toEqual([0.5, 0.33, 0.17])
    expect(synthesis.topContributors[0].weight).toBeGreaterThanOrEqual(
      synthesis.topContributors[1].weight,
    )
  })

  it('includes prior biomarker and symptom trend summaries for Gemini context', () => {
    const previousValidation = validateLabSessionInput({
      ...input,
      biomarkers: {
        ...input.biomarkers,
        ldlC: { value: 140, unit: 'mg/dL' },
      },
    })
    const currentValidation = validateLabSessionInput(input)
    const previous = createLabSession(input, previousValidation)
    const current = createLabSession(input, currentValidation)
    previous.sessionId = 'previous-session'
    current.sessionId = 'current-session'
    previous.timestamp = '2026-05-01T00:00:00.000Z'
    current.timestamp = '2026-05-23T00:00:00.000Z'

    const synthesis = scoreSession(current, {
      sessions: [current, previous],
      symptoms: [
        {
          entryId: 'previous-acne',
          sessionId: previous.sessionId,
          symptomKey: 'acne',
          severity: 'mild',
          note: null,
          timestamp: previous.timestamp,
        },
        {
          entryId: 'current-acne',
          sessionId: current.sessionId,
          symptomKey: 'acne',
          severity: 'severe',
          note: null,
          timestamp: current.timestamp,
        },
      ],
    })

    expect(synthesis.longitudinalSummary).toEqual(
      expect.objectContaining({
        priorSessionCount: 1,
        biomarkerTrends: expect.arrayContaining([
          expect.objectContaining({
            key: 'ldlC',
            previousValue: 140,
            currentValue: 180,
            trendLabel: 'increased',
          }),
        ]),
        symptomTrends: expect.arrayContaining([
          expect.objectContaining({
            symptomKey: 'acne',
            previousSeverity: 'mild',
            currentSeverity: 'severe',
            trendLabel: 'increased',
          }),
        ]),
      }),
    )
  })

  it('does not produce partial synthesis output when mandatory data is incomplete', () => {
    const validation = validateLabSessionInput(input)
    const session = createLabSession(input, validation)
    delete session.biomarkers.dheas

    expect(() => scoreSession(session)).toThrow(InsufficientDataError)
  })
})
