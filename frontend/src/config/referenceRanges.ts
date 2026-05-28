import type { BiomarkerKey } from '../types/session'

export interface ReferenceRange {
  label: string
  unit: string
  clinicalMin: number
  clinicalMax: number
  plausibilityMin: number
  plausibilityMax: number
}

export const mandatoryBiomarkers = [
  'ldlC',
  'fastingGlucose',
  'fastingInsulin',
  'totalTestosterone',
  'amh',
  'lhFshRatio',
  'dheas',
] as const satisfies readonly BiomarkerKey[]

export const referenceRanges: Record<BiomarkerKey, ReferenceRange> = {
  ldlC: {
    label: 'LDL-C',
    unit: 'mg/dL',
    clinicalMin: 0,
    clinicalMax: 129,
    plausibilityMin: 0,
    plausibilityMax: 400,
  },
  fastingGlucose: {
    label: 'Fasting glucose',
    unit: 'mg/dL',
    clinicalMin: 70,
    clinicalMax: 99,
    plausibilityMin: 30,
    plausibilityMax: 500,
  },
  fastingInsulin: {
    label: 'Fasting insulin',
    unit: 'uIU/mL',
    clinicalMin: 2,
    clinicalMax: 20,
    plausibilityMin: 0,
    plausibilityMax: 300,
  },
  totalTestosterone: {
    label: 'Total testosterone',
    unit: 'ng/dL',
    clinicalMin: 15,
    clinicalMax: 70,
    plausibilityMin: 0,
    plausibilityMax: 250,
  },
  amh: {
    label: 'AMH',
    unit: 'ng/mL',
    clinicalMin: 1,
    clinicalMax: 6.8,
    plausibilityMin: 0,
    plausibilityMax: 30,
  },
  lhFshRatio: {
    label: 'LH/FSH ratio',
    unit: 'ratio',
    clinicalMin: 0.5,
    clinicalMax: 2,
    plausibilityMin: 0,
    plausibilityMax: 10,
  },
  dheas: {
    label: 'DHEAS',
    unit: 'ug/dL',
    clinicalMin: 35,
    clinicalMax: 430,
    plausibilityMin: 0,
    plausibilityMax: 1000,
  },
}
