import { describe, expect, it } from 'vitest'
import { InsufficientDataError, scoreSession } from './scoringEngine'
import { createLabSession } from '../models/labSession'
import { validateLabSessionInput } from './validationEngine'
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
    expect(synthesis.topContributors[0].weight).toBeGreaterThanOrEqual(
      synthesis.topContributors[1].weight,
    )
  })

  it('does not produce partial synthesis output when mandatory data is incomplete', () => {
    const validation = validateLabSessionInput(input)
    const session = createLabSession(input, validation)
    delete session.biomarkers.dheas

    expect(() => scoreSession(session)).toThrow(InsufficientDataError)
  })
})
