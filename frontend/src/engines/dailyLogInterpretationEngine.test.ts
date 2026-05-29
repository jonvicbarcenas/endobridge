import { describe, expect, it } from 'vitest'
import { interpretDailyLog, summarizeDailyLogsForSynthesis } from './dailyLogInterpretationEngine'
import type { DailyLogRecord } from '../types/monitoring'

const baseLog: DailyLogRecord = {
  logId: 'daily-1',
  date: '2026-05-29T07:00:00.000Z',
  createdAt: '2026-05-29T07:00:00.000Z',
  foodNotes: '',
  exercise: '',
  sleepHours: null,
  mood: '',
  stressLevel: null,
  cycleEvent: '',
  weightKg: null,
  medicationAdherence: '',
  symptomsNote: '',
}

describe('daily log interpretation', () => {
  it('explains an anxious recent log in simple non-diagnostic wording', () => {
    const interpretation = interpretDailyLog({
      ...baseLog,
      mood: 'Anxious',
      stressLevel: 4,
      sleepHours: 5,
      symptomsNote: 'Cravings and bloating',
    })

    expect(interpretation.summary).toContain('anxious')
    expect(interpretation.possibleReasons).toContain('higher stress')
    expect(interpretation.possibleReasons).toContain('short sleep')
    expect(interpretation.plainLanguage).toContain('may be connected')
    expect(interpretation.plainLanguage).not.toMatch(/diagnos|treatment|prescrib/i)
  })

  it('uses plainLanguage from Gemini if available', () => {
    const interpretation = interpretDailyLog({
      ...baseLog,
      mood: 'Anxious',
      plainLanguage: 'In simple terms, Gemini summarized this log.',
    })

    expect(interpretation.plainLanguage).toBe('In simple terms, Gemini summarized this log.')
  })

  it('summarizes recent logs for the AI synthesis payload without medication detail fields', () => {
    const summaries = summarizeDailyLogsForSynthesis([
      {
        ...baseLog,
        mood: 'Anxious',
        medicationAdherence: 'Skipped',
        symptomsNote: 'Fatigue',
      },
    ])

    expect(summaries).toEqual([
      expect.objectContaining({
        logId: 'daily-1',
        mood: 'Anxious',
        summary: expect.stringContaining('anxious'),
      }),
    ])
    expect(JSON.stringify(summaries)).not.toMatch(/medicationAdherence|Skipped/i)
  })
})
