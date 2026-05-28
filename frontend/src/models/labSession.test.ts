import { describe, expect, it } from 'vitest'
import { validateLabSessionInput } from '../engines/validationEngine'
import type { LabSessionInput } from '../types/session'
import { createLabSession } from './labSession'

const validInput: LabSessionInput = {
  age: 28,
  bmi: 26.4,
  cycleRegularity: 'irregular',
  biomarkers: {
    ldlC: { value: 120, unit: 'mg/dL' },
    fastingGlucose: { value: 94, unit: 'mg/dL' },
    fastingInsulin: { value: 14, unit: 'uIU/mL' },
    totalTestosterone: { value: 55, unit: 'ng/dL' },
    amh: { value: 7.8, unit: 'ng/mL' },
    lhFshRatio: { value: 2.1, unit: 'ratio' },
    dheas: { value: 260, unit: 'ug/dL' },
  },
}

describe('createLabSession', () => {
  it('creates a complete session with questionnaire responses', () => {
    const validation = validateLabSessionInput(validInput)

    const session = createLabSession(validInput, validation, {
      'cycle-pattern': 'irregular',
    })

    expect(session.status).toBe('complete')
    expect(session.questionnaire).toEqual({ 'cycle-pattern': 'irregular' })
  })
})
