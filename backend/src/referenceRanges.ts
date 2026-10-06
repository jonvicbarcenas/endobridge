import type { BiomarkerKey } from '../../frontend/src/types/session.js'

export interface BackendReferenceRange {
  label: string
  unit: string
  plausibilityMin: number
  plausibilityMax: number
}

export const backendReferenceRanges: Record<BiomarkerKey, BackendReferenceRange> = {
  totalCholesterol: { label: 'Total cholesterol', unit: 'mg/dL', plausibilityMin: 0, plausibilityMax: 1000 },
  ldlC: {
    label: 'LDL-C',
    unit: 'mg/dL',
    plausibilityMin: 0,
    plausibilityMax: 400,
  },
  hdlC: { label: 'HDL-C', unit: 'mg/dL', plausibilityMin: 0, plausibilityMax: 250 },
  triglycerides: { label: 'Triglycerides', unit: 'mg/dL', plausibilityMin: 0, plausibilityMax: 2000 },
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
  ogttTwoHourGlucose: { label: '75 g OGTT glucose (2 hour)', unit: 'mg/dL', plausibilityMin: 0, plausibilityMax: 600 },
  hba1c: { label: 'HbA1c', unit: '%', plausibilityMin: 0, plausibilityMax: 20 },
  tsh: { label: 'TSH', unit: 'mIU/L', plausibilityMin: 0, plausibilityMax: 100 },
  freeT3: { label: 'Free T3', unit: 'pg/mL', plausibilityMin: 0, plausibilityMax: 30 },
  freeT4: { label: 'Free T4', unit: 'ng/dL', plausibilityMin: 0, plausibilityMax: 10 },
}
