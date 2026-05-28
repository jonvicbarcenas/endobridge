import type { BiomarkerKey } from '../../frontend/src/types/session.js'

export interface BackendReferenceRange {
  label: string
  unit: string
}

export const backendReferenceRanges: Record<BiomarkerKey, BackendReferenceRange> = {
  ldlC: {
    label: 'LDL-C',
    unit: 'mg/dL',
  },
  fastingGlucose: {
    label: 'Fasting glucose',
    unit: 'mg/dL',
  },
  fastingInsulin: {
    label: 'Fasting insulin',
    unit: 'uIU/mL',
  },
  totalTestosterone: {
    label: 'Total testosterone',
    unit: 'ng/dL',
  },
  amh: {
    label: 'AMH',
    unit: 'ng/mL',
  },
  lhFshRatio: {
    label: 'LH/FSH ratio',
    unit: 'ratio',
  },
  dheas: {
    label: 'DHEAS',
    unit: 'ug/dL',
  },
}
