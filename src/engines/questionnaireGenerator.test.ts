import { describe, expect, it } from 'vitest'
import { generateQuestionnaire } from './questionnaireGenerator'

describe('generateQuestionnaire', () => {
  it('adds contextual questions for flagged biomarkers without duplicates', () => {
    const questions = generateQuestionnaire([
      { key: 'amh', direction: 'high' },
      { key: 'fastingGlucose', direction: 'high' },
      { key: 'fastingInsulin', direction: 'high' },
    ])

    const ids = questions.map((question) => question.id)

    expect(ids).toContain('cycle-pattern')
    expect(ids).toContain('glucose-symptoms')
    expect(new Set(ids).size).toBe(ids.length)
  })
})
