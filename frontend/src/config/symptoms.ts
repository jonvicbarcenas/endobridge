import type { SymptomKey, SymptomSeverity } from '../types/session'

export interface SymptomDefinition {
  key: SymptomKey
  label: string
  description: string
}

export const symptomDefinitions: SymptomDefinition[] = [
  {
    key: 'cycleIrregularity',
    label: 'Irregular periods / cycle regularity',
    description: 'Cycle timing or regularity changes during this monitoring period.',
  },
  {
    key: 'acne',
    label: 'Acne',
    description: 'New or worsening acne compared with your usual pattern.',
  },
  {
    key: 'hirsutism',
    label: 'Hirsutism / excessive hair growth',
    description: 'Excessive hair growth on face, chest, abdomen, or other androgen-sensitive areas.',
  },
  {
    key: 'fatigue',
    label: 'Fatigue',
    description: 'Low energy or tiredness affecting regular activities.',
  },
  {
    key: 'weightChange',
    label: 'Unexplained weight change',
    description: 'Weight gain or loss not clearly linked to intentional diet or activity changes.',
  },
]

export const symptomSeverityOptions: { value: SymptomSeverity; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
]

export const symptomSeverityRank: Record<SymptomSeverity, number> = {
  none: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
}

export function getSymptomLabel(symptomKey: SymptomKey) {
  return symptomDefinitions.find((symptom) => symptom.key === symptomKey)?.label ?? symptomKey
}

export function getSymptomOrder(symptomKey: SymptomKey) {
  const index = symptomDefinitions.findIndex((symptom) => symptom.key === symptomKey)
  return index === -1 ? symptomDefinitions.length : index
}
