import type { BiomarkerKey } from '../../frontend/src/types/session.js'

export interface BackendReferenceRange {
  label: string
  unit: string
  plausibilityMin: number
  plausibilityMax: number
}

export const backendReferenceRanges: Record<BiomarkerKey, BackendReferenceRange> = {
  ldlC: {
    label: 'LDL-C',
    unit: 'mg/dL',
    plausibilityMin: 0,
    plausibilityMax: 400,
  },
  fastingGlucose: {
    label: 'Fasting glucose',
    unit: 'mg/dL',
    plausibilityMin: 30,
    plausibilityMax: 500,
  },
  fastingInsulin: {
    label: 'Fasting insulin',
    unit: 'uIU/mL',
    plausibilityMin: 0,
    plausibilityMax: 300,
  },
  totalTestosterone: {
    label: 'Total testosterone',
    unit: 'ng/dL',
    plausibilityMin: 0,
    plausibilityMax: 250,
  },
  amh: {
    label: 'AMH',
    unit: 'ng/mL',
    plausibilityMin: 0,
    plausibilityMax: 30,
  },
  lhFshRatio: {
    label: 'LH/FSH ratio',
    unit: 'ratio',
    plausibilityMin: 0,
    plausibilityMax: 10,
  },
  dheas: {
    label: 'DHEAS',
    unit: 'ug/dL',
    plausibilityMin: 0,
    plausibilityMax: 1000,
  },
}
