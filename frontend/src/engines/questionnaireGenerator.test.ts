import { describe, expect, it } from 'vitest'
import { generateQuestionnaire } from './questionnaireGenerator'
import type { BiomarkerEntryMap } from '../types/session'

const biomarkers: BiomarkerEntryMap = {
  amh: {
    key: 'amh',
    value: 7.2,
    unit: 'ng/mL',
    isPlausible: true,
    isFlagged: true,
    direction: 'high',
  },
  fastingGlucose: {
    key: 'fastingGlucose',
    value: 96,
    unit: 'mg/dL',
    isPlausible: true,
    isFlagged: false,
    direction: 'normal',
  },
}

describe('generateQuestionnaire', () => {
  it('always includes base questions from the fixed bank', () => {
    const ids = generateQuestionnaire({ biomarkers: {} }).map((question) => question.id)

    expect(ids).toEqual([
      'q1-age',
      'q2-current-weight',
      'q3-height',
      'q4-cycle-regularity-3-months',
      'q5-usual-cycle-length',
      'q6-last-menstrual-period',
      'q7-menstrual-flow',
      'q8-pelvic-pain',
    ])
  })

  it('adds present-biomarker questions and prioritizes flagged follow-ups without duplicates', () => {
    const questions = generateQuestionnaire({
      biomarkers,
      flags: [{ key: 'amh', direction: 'high' }],
    })
    const ids = questions.map((question) => question.id)

    expect(ids).toContain('q14-missed-periods')
    expect(ids).toContain('q18-weight-changes')
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.indexOf('q14-missed-periods')).toBeLessThan(ids.indexOf('q18-weight-changes'))
  })

  it('adds optional daily context and medication adherence only when requested', () => {
    const withoutOptional = generateQuestionnaire({ biomarkers })
    const withOptional = generateQuestionnaire({
      biomarkers,
      includeDailyContext: true,
      hasMedicationRecords: true,
    })

    expect(withoutOptional.map((question) => question.id)).not.toContain('q24-sleep-hours')
    expect(withoutOptional.map((question) => question.id)).not.toContain('q29-medication-scheduled')
    expect(withOptional.map((question) => question.id)).toContain('q24-sleep-hours')
    expect(withOptional.map((question) => question.id)).toContain('q29-medication-scheduled')
  })
})
