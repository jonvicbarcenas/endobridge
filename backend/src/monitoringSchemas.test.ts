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
  it('accepts a legitimate client-created lab session', () => {
    const session = createLabSession(input, validateLabSessionInput(input))
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
