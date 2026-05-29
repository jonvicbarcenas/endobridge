import { describe, expect, it } from 'vitest'
import { InsufficientDataError, scoreSession } from './scoringEngine'
import { createLabSession } from '../models/labSession'
import { validateLabSessionInput } from './validationEngine'
import type { DailyLogRecord, LabDocumentRecord } from '../types/monitoring'
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

  it('includes recent daily logs and uploaded lab document context in synthesis output', () => {
    const validation = validateLabSessionInput(input)
    const session = createLabSession(input, validation)
    session.sessionId = 'current-session'
    session.timestamp = '2026-05-29T08:00:00.000Z'
    session.supplementary.labDocumentIds = ['doc-1']

    const dailyLogs: DailyLogRecord[] = [
      {
        logId: 'daily-1',
        date: '2026-05-29T07:00:00.000Z',
        createdAt: '2026-05-29T07:00:00.000Z',
        foodNotes: 'Cravings',
        exercise: '',
        sleepHours: 5,
        mood: 'Anxious',
        stressLevel: 4,
        cycleEvent: '',
        weightKg: 68,
        medicationAdherence: 'Skipped',
        symptomsNote: 'Fatigue',
      },
    ]
    const labDocuments: LabDocumentRecord[] = [
      {
        documentId: 'doc-1',
        fileName: 'lab-photo.png',
        fileType: 'image/png',
        fileSize: 1234,
        uploadedAt: '2026-05-29T06:00:00.000Z',
        dataUrl: 'data:image/png;base64,abc',
        extractionStatus: 'ocr-scanned',
        extractedTextPreview: 'LDL cholesterol 180 mg/dL',
        scanMessage: 'Scanned image and found 1 biomarker value for review.',
      },
    ]

    const synthesis = scoreSession(session, {
      dailyLogs,
      labDocuments,
    })

    expect(synthesis.dailyLogSummary).toEqual([
      expect.objectContaining({
        logId: 'daily-1',
        mood: 'Anxious',
        summary: expect.stringContaining('anxious'),
      }),
    ])
    expect(synthesis.labDocumentContext).toEqual([
      expect.objectContaining({
        documentId: 'doc-1',
        fileName: 'lab-photo.png',
        extractionStatus: 'ocr-scanned',
      }),
    ])
    expect(JSON.stringify(synthesis)).not.toMatch(/medicationAdherence|Skipped/i)
  })

  it('links only daily logs from 7 days before through 3 days after the lab session', () => {
    const validation = validateLabSessionInput(input)
    const session = createLabSession(input, validation)
    session.sessionId = 'current-session'
    session.timestamp = '2026-05-29T08:00:00.000Z'

    const dailyLogs: DailyLogRecord[] = [
      {
        logId: 'too-old',
        date: '2026-05-21T07:59:59.000Z',
        createdAt: '2026-05-21T07:59:59.000Z',
        foodNotes: '',
        exercise: '',
        sleepHours: null,
        mood: 'Old',
        stressLevel: null,
        cycleEvent: '',
        weightKg: null,
        medicationAdherence: '',
        symptomsNote: '',
      },
      {
        logId: 'within-before',
        date: '2026-05-22T08:00:00.000Z',
        createdAt: '2026-05-22T08:00:00.000Z',
        foodNotes: '',
        exercise: '',
        sleepHours: 5,
        mood: 'Anxious',
        stressLevel: 4,
        cycleEvent: '',
        weightKg: null,
        medicationAdherence: '',
        symptomsNote: 'Fatigue',
      },
      {
        logId: 'within-after',
        date: '2026-06-01T08:00:00.000Z',
        createdAt: '2026-06-01T08:00:00.000Z',
        foodNotes: '',
        exercise: '',
        sleepHours: null,
        mood: 'Okay',
        stressLevel: null,
        cycleEvent: '',
        weightKg: null,
        medicationAdherence: '',
        symptomsNote: 'Cramps',
      },
      {
        logId: 'too-new',
        date: '2026-06-02T08:00:01.000Z',
        createdAt: '2026-06-02T08:00:01.000Z',
        foodNotes: '',
        exercise: '',
        sleepHours: null,
        mood: 'Future',
        stressLevel: null,
        cycleEvent: '',
        weightKg: null,
        medicationAdherence: '',
        symptomsNote: '',
      },
    ]

    const synthesis = scoreSession(session, { dailyLogs })

    expect(synthesis.dailyLogSummary.map((log) => log.logId)).toEqual([
      'within-after',
      'within-before',
    ])
  })

  it('does not produce partial synthesis output when mandatory data is incomplete', () => {
    const validation = validateLabSessionInput(input)
    const session = createLabSession(input, validation)
    delete session.biomarkers.dheas

    expect(() => scoreSession(session)).toThrow(InsufficientDataError)
  })
})
