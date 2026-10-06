import { describe, expect, it } from 'vitest'
import { createLabSession } from '../../frontend/src/models/labSession'
import { validateLabSessionInput } from '../../frontend/src/engines/validationEngine'
import { validateMonitoringRecord, validateReportRequest } from './monitoringSchemas'
import type { LabSessionInput } from '../../frontend/src/types/session'

const input: LabSessionInput = {
  age: 28,
  biomarkers: {
    ldlC: { value: 130, unit: 'mg/dL' },
    fastingGlucose: { value: 96, unit: 'mg/dL' },
    fastingInsulin: { value: 15, unit: 'uIU/mL' },
    totalTestosterone: { value: 54, unit: 'ng/dL' },
    amh: { value: 7.2, unit: 'ng/mL' },
    lhFshRatio: { value: 1.7, unit: 'ratio' },
    dheas: { value: 320, unit: 'ug/dL' },
  },
}

describe('monitoring API schemas', () => {
  it('accepts the fixed ten-value panel and rejects omitted or extra markers', () => {
    const fixedInput: LabSessionInput = {
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
    const session = createLabSession(fixedInput, validateLabSessionInput(fixedInput))
    expect(validateMonitoringRecord('labSessions', session)).toEqual(session)

    const { hba1c: _omitted, ...withoutHbA1c } = session.biomarkers
    expect(_omitted).toBeDefined()
    expect(() => validateMonitoringRecord('labSessions', {
      ...session, biomarkers: withoutHbA1c,
    })).toThrow(/hba1c/i)
    const { ldlC: _omittedLdl, ...withoutLdl } = session.biomarkers
    expect(_omittedLdl).toBeDefined()
    expect(() => validateMonitoringRecord('labSessions', {
      ...session, biomarkers: withoutLdl,
    })).toThrow(/ldlC/i)
    expect(() => validateMonitoringRecord('labSessions', {
      ...session, biomarkers: { ...session.biomarkers, fastingInsulin: {
        key: 'fastingInsulin', value: 12, unit: 'uIU/mL', isPlausible: true, isFlagged: false, direction: 'normal',
      } },
    })).toThrow(/fastingInsulin/i)
  })

  it('accepts a legitimate client-created lab session', () => {
    const session = createLabSession(input, validateLabSessionInput(input))
    expect(validateMonitoringRecord('labSessions', session)).toEqual(session)
  })

  it('accepts a new minimal metabolic session and rejects a missing selected OGTT result', () => {
    const metabolicInput: LabSessionInput = {
      age: 30,
      weightKg: 65,
      heightCm: 160,
      bmi: 25.4,
      glucoseTest: 'ogtt',
      biomarkers: {
        totalCholesterol: { value: 198, unit: 'mg/dL' },
        ldlC: { value: 120, unit: 'mg/dL' },
        hdlC: { value: 52, unit: 'mg/dL' },
        triglycerides: { value: 130, unit: 'mg/dL' },
        fastingGlucose: { value: 95, unit: 'mg/dL' },
        ogttTwoHourGlucose: { value: 126, unit: 'mg/dL' },
      },
    }
    const session = createLabSession(metabolicInput, validateLabSessionInput(metabolicInput))
    expect(validateMonitoringRecord('labSessions', session)).toEqual(session)
    const { ogttTwoHourGlucose: _omitted, ...withoutOgtt } = session.biomarkers
    expect(_omitted).toBeDefined()
    expect(() => validateMonitoringRecord('labSessions', {
      ...session,
      biomarkers: withoutOgtt,
    })).toThrow(/ogttTwoHourGlucose/i)
  })

  it('allows clinician-selected HbA1c without a fasting glucose result', () => {
    const hba1cInput: LabSessionInput = {
      age: 30,
      weightKg: 65,
      heightCm: 160,
      bmi: 25.4,
      glucoseTest: 'hba1c',
      biomarkers: {
        totalCholesterol: { value: 190, unit: 'mg/dL' },
        ldlC: { value: 110, unit: 'mg/dL' },
        hdlC: { value: 54, unit: 'mg/dL' },
        triglycerides: { value: 125, unit: 'mg/dL' },
        hba1c: { value: 5.4, unit: '%' },
      },
    }
    const validation = validateLabSessionInput(hba1cInput)
    expect(validation.isValid).toBe(true)
    const session = createLabSession(hba1cInput, validation)
    expect(validateMonitoringRecord('labSessions', session)).toEqual(session)
  })

  it('rejects forged classifications, units, and unknown fields', () => {
    const session = createLabSession(input, validateLabSessionInput(input))
    expect(() =>
      validateMonitoringRecord('labSessions', {
        ...session,
        biomarkers: {
          ...session.biomarkers,
          ldlC: { ...session.biomarkers.ldlC, unit: 'mmol/L', direction: 'normal' },
        },
        attackerControlled: true,
      }),
    ).toThrow(/invalid monitoring record/i)
  })

  it('accepts only a session id for report generation', () => {
    expect(validateReportRequest({ sessionId: 'session-1' })).toEqual({ sessionId: 'session-1' })
    expect(() =>
      validateReportRequest({ sessionId: 'session-1', synthesis: { flaggedBiomarkers: [] } }),
    ).toThrow(/invalid report request/i)
  })
})
