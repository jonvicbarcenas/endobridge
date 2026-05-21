import type { BiomarkerKey, Direction } from '../types/session'

export interface QuestionDefinition {
  id: string
  label: string
  type: 'select' | 'number' | 'text'
  options?: string[]
  triggers: Array<{ key: BiomarkerKey; direction?: Direction }>
}

export const questionBank: QuestionDefinition[] = [
  {
    id: 'cycle-pattern',
    label: 'Cycle pattern during this monitoring period',
    type: 'select',
    options: ['regular', 'irregular', 'missed', 'unknown'],
    triggers: [
      { key: 'amh', direction: 'high' },
      { key: 'lhFshRatio', direction: 'high' },
      { key: 'totalTestosterone', direction: 'high' },
    ],
  },
  {
    id: 'glucose-symptoms',
    label: 'Recent glucose-related symptoms',
    type: 'select',
    options: ['none', 'fatigue', 'increased thirst', 'frequent hunger'],
    triggers: [
      { key: 'fastingGlucose', direction: 'high' },
      { key: 'fastingInsulin', direction: 'high' },
    ],
  },
  {
    id: 'skin-hair-changes',
    label: 'Skin or hair changes noticed since last session',
    type: 'select',
    options: ['none', 'acne', 'hair growth', 'hair thinning'],
    triggers: [
      { key: 'totalTestosterone', direction: 'high' },
      { key: 'dheas', direction: 'high' },
    ],
  },
  {
    id: 'cardio-context',
    label: 'Lifestyle context relevant to lipid tracking',
    type: 'text',
    triggers: [{ key: 'ldlC', direction: 'high' }],
  },
]
