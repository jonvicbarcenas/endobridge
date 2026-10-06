import { describe, expect, it } from 'vitest'
import { generateQuestionnaire, visibleQuestions } from './questionnaireGenerator'
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
      'q14-missed-periods',
      'q15-predictable-periods',
      'q16-spotting',
      'q17-cycle-comparison',
    ])
  })

  it('skips cycle follow-ups for regular cycles and skips missed-period count after No', () => {
    const questions = generateQuestionnaire({ biomarkers: {} })
    const regularIds = visibleQuestions(questions, { 'q4-cycle-regularity-3-months': 'Yes' }).map((question) => question.id)
    expect(regularIds.slice(regularIds.indexOf('q8-pelvic-pain') + 1)[0]).toBe('q17-cycle-comparison')
    expect(regularIds).not.toContain('q14-missed-periods')

    const noMissedIds = visibleQuestions(questions, {
      'q4-cycle-regularity-3-months': 'No',
      'q14-missed-periods': 'No',
    }).map((question) => question.id)
    expect(noMissedIds).toContain('q14-missed-periods')
    expect(noMissedIds).not.toContain('q15-predictable-periods')
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
    expect(withOptional.map((question) => question.id)).not.toContain('q22-food-notes')
    expect(withOptional.map((question) => question.id)).not.toContain('q25-sleep-quality')
    expect(withOptional.map((question) => question.id)).not.toContain('q26-stress-level')
    expect(withOptional.map((question) => question.id)).not.toContain('q30-medication-note')
  })
})
