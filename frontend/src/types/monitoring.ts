import type { BiomarkerKey } from './session'

export interface DailyLogRecord {
  logId: string
  date: string
  foodNotes: string
  exercise: string
  sleepHours: number | null
  mood: string
  stressLevel: number | null
  cycleEvent: string
  weightKg: number | null
  medicationAdherence: string
  symptomsNote: string
  createdAt: string
}

export type LabDocumentExtractionStatus =
  | 'stored-only'
  | 'scanned'
  | 'ocr-scanned'
  | 'scan-failed'

export interface ExtractedBiomarkerValue {
  key: BiomarkerKey
  value: number
  unit: string
  sourceLabel: string
  confidence: 'high' | 'medium'
}

export interface LabDocumentRecord {
  documentId: string
  fileName: string
  fileType: string
  fileSize: number
  uploadedAt: string
  dataUrl: string
  extractionStatus: LabDocumentExtractionStatus
  extractedTextPreview?: string
  extractedBiomarkers?: Partial<Record<BiomarkerKey, ExtractedBiomarkerValue>>
  scanMessage?: string
}
