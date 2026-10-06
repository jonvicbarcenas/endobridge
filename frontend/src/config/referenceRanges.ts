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
] as const satisfies readonly BiomarkerKey[]

export const referenceRanges: Record<BiomarkerKey, ReferenceRange> = {
  totalCholesterol: { label: 'Total cholesterol', unit: 'mg/dL', clinicalMin: 0, clinicalMax: 199, plausibilityMin: 0, plausibilityMax: 1000 },
  ldlC: {
    label: 'LDL-C (bad cholesterol)',
    unit: 'mg/dL',
    clinicalMin: 0,
    clinicalMax: 129,
    plausibilityMin: 0,
    plausibilityMax: 400,
  },
  hdlC: { label: 'HDL-C (good cholesterol)', unit: 'mg/dL', clinicalMin: 50, clinicalMax: 150, plausibilityMin: 0, plausibilityMax: 250 },
  triglycerides: { label: 'Triglycerides', unit: 'mg/dL', clinicalMin: 0, clinicalMax: 149, plausibilityMin: 0, plausibilityMax: 2000 },
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
  ogttTwoHourGlucose: { label: '75 g OGTT glucose (2 hour)', unit: 'mg/dL', clinicalMin: 0, clinicalMax: 139, plausibilityMin: 0, plausibilityMax: 600 },
  hba1c: { label: 'HbA1c', unit: '%', clinicalMin: 0, clinicalMax: 5.6, plausibilityMin: 0, plausibilityMax: 20 },
  tsh: { label: 'TSH', unit: 'mIU/L', clinicalMin: 0.4, clinicalMax: 4, plausibilityMin: 0, plausibilityMax: 100 },
  freeT3: { label: 'Free T3', unit: 'pg/mL', clinicalMin: 2, clinicalMax: 4.4, plausibilityMin: 0, plausibilityMax: 30 },
  freeT4: { label: 'Free T4', unit: 'ng/dL', clinicalMin: 0.8, clinicalMax: 1.8, plausibilityMin: 0, plausibilityMax: 10 },
}

export const allBiomarkers = [
  'totalTestosterone', 'triglycerides', 'fastingGlucose', 'totalCholesterol', 'hdlC', 'ldlC',
  'tsh', 'freeT3', 'freeT4', 'hba1c',
] as const satisfies readonly BiomarkerKey[]
export const requiredNewBiomarkers = allBiomarkers
export const assayDependentBiomarkers = new Set<BiomarkerKey>([
  'fastingInsulin', 'totalTestosterone', 'tsh', 'freeT3', 'freeT4',
])
