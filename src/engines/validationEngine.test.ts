import { describe, expect, it } from 'vitest'
import { validateLabSessionInput } from './validationEngine'
import type { LabSessionInput } from '../types/session'

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

describe('validateLabSessionInput', () => {
  it('rejects under-18 users before session creation', () => {
    const result = validateLabSessionInput({ ...validInput, age: 17 })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('age must be at least 18')
  })

  it('blocks missing mandatory biomarkers', () => {
    const input = structuredClone(validInput)
    delete input.biomarkers.amh

    const result = validateLabSessionInput(input)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('amh is required')
  })

  it('allows plausible out-of-clinical-range values but flags them', () => {
    const result = validateLabSessionInput({
      ...validInput,
      biomarkers: {
        ...validInput.biomarkers,
        ldlC: { value: 190, unit: 'mg/dL' },
      },
    })

    expect(result.isValid).toBe(true)
    expect(result.validatedBiomarkers.ldlC?.isFlagged).toBe(true)
    expect(result.validatedBiomarkers.ldlC?.direction).toBe('high')
  })
})
