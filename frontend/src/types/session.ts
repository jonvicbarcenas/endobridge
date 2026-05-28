import type { InsightReport } from './insight'

export type BiomarkerKey =
  | 'ldlC'
  | 'fastingGlucose'
  | 'fastingInsulin'
  | 'totalTestosterone'
  | 'amh'
  | 'lhFshRatio'
  | 'dheas'

export type Direction = 'low' | 'high' | 'normal'

export interface BiomarkerInput {
  value: number
  unit: string
}

export type BiomarkerInputMap = Partial<Record<BiomarkerKey, BiomarkerInput>>

export interface LabSessionInput {
  age: number
  bmi?: number
  cycleRegularity?: string
  biomarkers: BiomarkerInputMap
}

export interface BiomarkerEntry extends BiomarkerInput {
  key: BiomarkerKey
  isPlausible: boolean
  isFlagged: boolean
  direction: Direction
}

export type BiomarkerEntryMap = Partial<Record<BiomarkerKey, BiomarkerEntry>>

export interface ValidationResult {
  validatedBiomarkers: BiomarkerEntryMap
  flags: string[]
  errors: string[]
  isValid: boolean
}

export interface SupplementaryData {
  age: number
  bmi?: number
  cycleRegularity?: string
}

export interface QuestionnaireResponse {
  [questionId: string]: string | string[] | number | boolean | null
}

export interface LabSession {
  sessionId: string
  timestamp: string
  status: 'in-progress' | 'complete'
  biomarkers: BiomarkerEntryMap
  supplementary: SupplementaryData
  questionnaire: QuestionnaireResponse | null
  insightReport: InsightReport | null
}

export type SymptomKey =
  | 'cycleIrregularity'
  | 'acne'
  | 'hirsutism'
  | 'fatigue'
  | 'weightChange'

export type SymptomSeverity = 'none' | 'mild' | 'moderate' | 'severe'

export interface SymptomEntry {
  entryId: string
  sessionId: string
  symptomKey: SymptomKey
  severity: SymptomSeverity
  note: string | null
  timestamp: string
}

export interface MedicationRecord {
  medId: string
  name: string
  dosage: string
  scheduleTime: string
  frequency: MedicationFrequency
  createdAt: string
  nextReminderAt: string | null
  isActive: boolean
  lastTakenAt?: string | null
}

export type MedicationFrequency = 'daily' | 'weekly' | 'asNeeded'
