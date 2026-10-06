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

const fixedPanelInput: LabSessionInput = {
  age: 28,
  weightKg: 65,
  heightCm: 160,
  bmi: 25.4,
  panelVersion: 'fixed-ten',
  biomarkers: {
    totalTestosterone: { value: 55, unit: 'ng/dL' },
    triglycerides: { value: 130, unit: 'mg/dL' },
    fastingGlucose: { value: 94, unit: 'mg/dL' },
    totalCholesterol: { value: 190, unit: 'mg/dL' },
    hdlC: { value: 55, unit: 'mg/dL' },
    ldlC: { value: 110, unit: 'mg/dL' },
    tsh: { value: 2, unit: 'mIU/L' },
    freeT3: { value: 3, unit: 'pg/mL' },
    freeT4: { value: 1.2, unit: 'ng/dL' },
    hba1c: { value: 5.3, unit: '%' },
  },
}

describe('validateLabSessionInput', () => {
  it('requires exactly the ten fixed-panel values without a glucose selector', () => {
    const result = validateLabSessionInput(fixedPanelInput)
    expect(result.isValid).toBe(true)
    expect(Object.keys(result.validatedBiomarkers)).toHaveLength(10)

    const incomplete = structuredClone(fixedPanelInput)
    delete incomplete.biomarkers.hba1c
    delete incomplete.biomarkers.freeT4
    const missing = validateLabSessionInput(incomplete)
    expect(missing.errors).toContain('hba1c is required')
    expect(missing.errors).toContain('freeT4 is required')
  })
  it('rejects under-18 users before session creation', () => {
    const result = validateLabSessionInput({ ...validInput, age: 17 })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('age must be at least 18')
  })

  it('blocks missing mandatory biomarkers', () => {
    const input = structuredClone(validInput)
    delete input.biomarkers.totalTestosterone

    const result = validateLabSessionInput(input)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('totalTestosterone is required')
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

  it('requires the full lipid panel and the clinician-selected glucose test for new sessions', () => {
    const result = validateLabSessionInput({ ...validInput, glucoseTest: 'ogtt' })
    expect(result.errors).toContain('totalCholesterol is required')
    expect(result.errors).toContain('hdlC is required')
    expect(result.errors).toContain('triglycerides is required')
    expect(result.errors).toContain('ogttTwoHourGlucose is required')
  })

  it('accepts HbA1c as the selected glycemic test without fasting glucose', () => {
    const input = structuredClone(validInput)
    input.glucoseTest = 'hba1c'
    input.weightKg = 65
    input.heightCm = 160
    input.bmi = 25.4
    delete input.biomarkers.fastingGlucose
    input.biomarkers.totalCholesterol = { value: 180, unit: 'mg/dL' }
    input.biomarkers.hdlC = { value: 55, unit: 'mg/dL' }
    input.biomarkers.triglycerides = { value: 100, unit: 'mg/dL' }
    input.biomarkers.hba1c = { value: 5.4, unit: '%' }
    expect(validateLabSessionInput(input).isValid).toBe(true)
  })

  it('does not flag a thyroid result without a supplied interval and ignores retired biomarkers', () => {
    const withoutRange = validateLabSessionInput(validInput)
    expect(withoutRange.validatedBiomarkers.amh).toBeUndefined()

    const withRange = validateLabSessionInput({
      ...validInput,
      biomarkers: { ...validInput.biomarkers, tsh: { value: 5.8, unit: 'mIU/L' } },
    })
    expect(withRange.validatedBiomarkers.tsh?.isFlagged).toBe(false)
    expect(withRange.validatedBiomarkers.tsh?.direction).toBe('normal')
  })
})
